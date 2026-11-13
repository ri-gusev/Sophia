export type ProjectedMarker = { id: string; x: number; y: number };
export type MarkerGroup = { anchorId: string; ids: string[] };

export function groupProjectedMarkers(points: readonly ProjectedMarker[], threshold = 48): MarkerGroup[] {
  const ordered = [...points].sort((a, b) => a.id.localeCompare(b.id));
  const visited = new Set<string>();
  const groups: MarkerGroup[] = [];
  for (const point of ordered) {
    if (visited.has(point.id)) continue;
    const members = [point];
    visited.add(point.id);
    for (let i = 0; i < members.length; i++) {
      for (const candidate of ordered) {
        if (!visited.has(candidate.id) && Math.hypot(candidate.x - members[i].x, candidate.y - members[i].y) < threshold) {
          members.push(candidate);
          visited.add(candidate.id);
        }
      }
    }
    const ids = members.map(member => member.id).sort();
    groups.push({ anchorId: ids[0], ids });
  }
  return groups;
}
