import type { Metadata } from "next";
import { Fragment } from "react";
import type { LegalDocumentKind } from "./contract";
import { legalReleaseReady, legalRevision } from "./server/revisions";
import styles from "../account/account.module.css";

export function legalMetadata(kind: LegalDocumentKind): Metadata {
  const document = legalRevision(kind);
  return { title: document.title, ...((!document.effectiveDate || !legalReleaseReady()) && { robots: { index: false } }) };
}

function emphasis(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
    part.startsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>);
}

export function LegalPage({ kind }: { kind: LegalDocumentKind }) {
  const document = legalRevision(kind);
  const date = document.effectiveDate && <time dateTime={document.effectiveDate}>
    {document.effectiveDate.split("-").reverse().join(".")}
  </time>;
  const blocks = document.body.replace(/^(## .+)\n(?!\n)/gm, "$1\n\n").split("\n\n");
  return <main id="main" className={`container ${styles.profilePage}`}>
    <article className={`glass ${styles.card} ${styles.legalArticle}`}>
      <h1>{document.title}</h1>
      <p className={styles.hint}>Редакция {document.version}. {legalReleaseReady() && date
        ? <>Действует с {date}.</>
        : <>Проект документа. {date
          ? <>Дата вступления в силу по проекту — {date}.</>
          : "Дата вступления в силу не утверждена."}</>}</p>
      {blocks.map((block, index) => block.startsWith("## ") ? <h2 key={index}>{block.slice(3)}</h2> :
        block.startsWith("- ") ? <ul key={index}>{block.split("\n").map(line => <li key={line}>{emphasis(line.slice(2))}</li>)}</ul> :
          <p key={index}>{emphasis(block)}</p>)}
    </article>
  </main>;
}
