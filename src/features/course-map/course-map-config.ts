import { COURSE_BRANCHES, COURSE_ERAS, ERA_WIDTH, type CourseEra, type CourseStep, type EraId } from "./course-map-data";
import type { PhilosopherCatalogId } from "./philosopher-catalog-data";

export type MapIcon = "book" | "dialogue" | "idea" | "star" | "trophy" | "followers";
type NodeAction = { kind: "preview" } | { kind: "catalog"; catalogId: PhilosopherCatalogId };
type NodeConfiguration = {
  id: string;
  eraId: EraId;
  position: { x: number; y: number };
  icon: MapIcon;
  action: NodeAction;
} & ({ type: "main"; number: number; parentId?: never } | { type: "branch"; parentId: string; number?: never });

export type MapNode = NodeConfiguration & CourseStep & { era: CourseEra; eraIndex: number };

// Local positions are keyed by stable node IDs, not by the order of lesson content.
const NODE_CONFIGURATIONS: readonly NodeConfiguration[] = [
  { id: "presocratics", type: "main", eraId: "antiquity", number: 1, position: { x: 146, y: 331 }, icon: "book", action: { kind: "preview" } },
  { id: "plato", type: "main", eraId: "antiquity", number: 2, position: { x: 356, y: 241 }, icon: "dialogue", action: { kind: "catalog", catalogId: "plato" } },
  { id: "aristotle", type: "main", eraId: "antiquity", number: 3, position: { x: 804, y: 246 }, icon: "idea", action: { kind: "preview" } },
  { id: "stoicism", type: "main", eraId: "antiquity", number: 4, position: { x: 1031, y: 338 }, icon: "star", action: { kind: "preview" } },
  { id: "plato-followers", type: "branch", parentId: "plato", eraId: "antiquity", position: { x: 235, y: 185 }, icon: "followers", action: { kind: "preview" } },
  { id: "medieval-context", type: "main", eraId: "medieval", number: 1, position: { x: 146, y: 330 }, icon: "book", action: { kind: "preview" } },
  { id: "faith-reason", type: "main", eraId: "medieval", number: 2, position: { x: 356, y: 240 }, icon: "dialogue", action: { kind: "preview" } },
  { id: "universals", type: "main", eraId: "medieval", number: 3, position: { x: 581, y: 334 }, icon: "idea", action: { kind: "preview" } },
  { id: "scholasticism", type: "main", eraId: "medieval", number: 4, position: { x: 804, y: 246 }, icon: "star", action: { kind: "preview" } },
  { id: "medieval-reflection", type: "main", eraId: "medieval", number: 5, position: { x: 1031, y: 339 }, icon: "trophy", action: { kind: "preview" } },
  { id: "new-perspective", type: "main", eraId: "early-modern", number: 1, position: { x: 146, y: 337 }, icon: "book", action: { kind: "preview" } },
  { id: "doubt", type: "main", eraId: "early-modern", number: 2, position: { x: 356, y: 256 }, icon: "dialogue", action: { kind: "preview" } },
  { id: "experience-reason", type: "main", eraId: "early-modern", number: 3, position: { x: 581, y: 350 }, icon: "idea", action: { kind: "preview" } },
  { id: "knowledge", type: "main", eraId: "early-modern", number: 4, position: { x: 804, y: 266 }, icon: "star", action: { kind: "preview" } },
  { id: "modern-reflection", type: "main", eraId: "early-modern", number: 5, position: { x: 1031, y: 337 }, icon: "trophy", action: { kind: "preview" } },
  { id: "reason", type: "main", eraId: "german", number: 1, position: { x: 146, y: 356 }, icon: "book", action: { kind: "preview" } },
  { id: "critique", type: "main", eraId: "german", number: 2, position: { x: 356, y: 260 }, icon: "dialogue", action: { kind: "preview" } },
  { id: "freedom", type: "main", eraId: "german", number: 3, position: { x: 581, y: 376 }, icon: "idea", action: { kind: "preview" } },
  { id: "dialectics", type: "main", eraId: "german", number: 4, position: { x: 804, y: 263 }, icon: "star", action: { kind: "preview" } },
  { id: "german-reflection", type: "main", eraId: "german", number: 5, position: { x: 1031, y: 343 }, icon: "trophy", action: { kind: "preview" } },
  { id: "twentieth-century", type: "main", eraId: "contemporary", number: 1, position: { x: 146, y: 327 }, icon: "book", action: { kind: "preview" } },
  { id: "language", type: "main", eraId: "contemporary", number: 2, position: { x: 356, y: 243 }, icon: "dialogue", action: { kind: "preview" } },
  { id: "existence", type: "main", eraId: "contemporary", number: 3, position: { x: 581, y: 336 }, icon: "idea", action: { kind: "preview" } },
  { id: "society", type: "main", eraId: "contemporary", number: 4, position: { x: 804, y: 249 }, icon: "star", action: { kind: "preview" } },
  { id: "contemporary-reflection", type: "main", eraId: "contemporary", number: 5, position: { x: 1031, y: 338 }, icon: "trophy", action: { kind: "preview" } },
];

export const MAP_NODES: readonly MapNode[] = NODE_CONFIGURATIONS.map(configuration => {
  const eraIndex = COURSE_ERAS.findIndex(era => era.id === configuration.eraId);
  const era = COURSE_ERAS[eraIndex];
  const content = (configuration.type === "main" ? era?.steps : COURSE_BRANCHES)?.find(step => step.id === configuration.id);
  if (!era || !content) throw new Error(`Missing content for map node ${configuration.id}`);
  return { ...configuration, ...content, era, eraIndex, position: { x: eraIndex * ERA_WIDTH + configuration.position.x, y: configuration.position.y } };
});

export const MAP_BRANCHES = MAP_NODES.filter(node => node.type === "branch").map(node => {
  const parent = MAP_NODES.find(candidate => candidate.id === node.parentId);
  if (!parent || parent.type !== "main" || parent.eraId !== node.eraId) throw new Error(`Invalid parent for ${node.id}`);
  const { x: px, y: py } = parent.position, { x, y } = node.position;
  return { id: node.id, parentId: parent.id, path: `M ${px} ${py} C ${px - 45} ${py - 55}, ${x + 50} ${y + 30}, ${x} ${y}` };
});
