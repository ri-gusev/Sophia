import { cache } from "react";
import { readSession } from "./session";

// The root layout and a protected page can share the same session lookup for one render.
export const currentAccount = cache(readSession);
