type Chain = {
  name: string;
}[];
type Isnads = Chain[];

/** Minimal subset of JSON Canvas node types used here. You can expand with the full spec if needed. */
type CanvasNode = {
  id: string;
  type: "text" | "file" | "link" | "group";
  x: number;
  y: number;
  width?: number;
  height?: number;
  // For text nodes:
  text?: string;
  // optional styling / metadata (kept minimal)
  color?: string | number;
  // z-index ordering is the node array index
};

type CanvasEdge = {
  id: string;
  fromNode: string;
  toNode: string;
  // Optional: fromSide/toSide, label, color etc.
  fromSide?: "left" | "right" | "top" | "bottom";
  toSide?: "left" | "right" | "top" | "bottom";
  label?: string;
  color?: string;
};

type CanvasFile = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  // metadata optional (kept minimal)
  meta?: {
    title?: string;
    created?: string;
  };
};

/**
 * Build a JSON Canvas structure from the supplied Isnads JSON.
 * Deduplicate narrator names across all chains (single node per unique name).
 * Create edges for each chain: narrator[i] -> narrator[i+1].
 */
export function buildCanvasFromIsnads(isnads: Isnads): CanvasFile {
  // Layout params (tweak as needed)
  const nodeWidth = 220;
  const nodeHeight = 80;
  const xSpacing = 200;
  const ySpacing = 160;
  const marginX = 40;
  const marginY = 40;

  // Map to keep a single node per narrator name
  const nameToNodeId = new Map<string, string>();
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  // Helper to create/get node for narrator name
  let nextNodeIndex = 0;
  const createOrGetNode = (name: string, preferredX?: number, preferredY?: number): CanvasNode => {
    if (nameToNodeId.has(name)) {
      const id = nameToNodeId.get(name)!;
      // Find node object
      const node = nodes.find((n) => n.id === id)!;
      return node;
    }
    const id = `node-${++nextNodeIndex}`;
    // default position will be filled by first time placement caller
    const x = preferredX ?? marginX + (nodes.length % 10) * (nodeWidth + xSpacing);
    const y = preferredY ?? marginY + Math.floor(nodes.length / 10) * (nodeHeight + ySpacing);
    const node: CanvasNode = {
      id,
      type: "text",
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      text: name,
    };
    nodes.push(node);
    nameToNodeId.set(name, id);
    return node;
  };

  // To create clearer layout, we'll place nodes by chain positions:
  // For each chain (row), iterate narrators left → right and create nodes if missing.
  // If narrator already created but located far from this chain row, we will NOT move it,
  // to avoid repositioning nodes created by previous chains; however we will attempt to place
  // newly created nodes at (chainIndex * rowSpacing, positionInChain).
  let chainIndex = 0;
  for (const chain of isnads) {
    // compute y for this chain row
    const rowY = marginY + chainIndex * (nodeHeight + ySpacing);

    // For sequential placement along the x axis for this chain:
    for (let i = 0; i < chain.length; i++) {
      const narrator = chain[i];
      const posX = marginX + i * (nodeWidth + xSpacing);

      const existing = nameToNodeId.get(narrator.name);
      if (existing) {
        // node exists; ensure it has coordinates (if not set) - we will not override existing coordinates
        const node = nodes.find((n) => n.id === existing)!;
        if (node.x === undefined || node.y === undefined) {
          node.x = posX;
          node.y = rowY;
        }
      } else {
        // create new node at this chain row position
        createOrGetNode(narrator.name, posX, rowY);
      }

      // If there is a next narrator in the chain, create an edge from current -> next
      if (i + 1 < chain.length) {
        const currId = nameToNodeId.get(narrator.name)!;
        const nextName = chain[i + 1].name;
        // ensure next node exists (create placeholder if necessary)
        const nextNode = createOrGetNode(
          nextName,
          marginX + (i + 1) * (nodeWidth + xSpacing),
          rowY
        );

        const edgeId = `edge-${currId}-${nextNode.id}`;
        // Avoid duplicate edges
        if (!edges.some((e) => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            fromNode: currId,
            toNode: nextNode.id,
            fromSide: "right",
            toSide: "left",
            label: "",
          });
        }
      }
    }

    chainIndex++;
  }

  // Final result
  const canvas: CanvasFile = {
    nodes,
    edges,
    meta: {
      title: "Isnad Canvas",
      created: new Date().toISOString(),
    },
  };

  return canvas;
}
