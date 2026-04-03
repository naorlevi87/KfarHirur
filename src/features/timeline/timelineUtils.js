// Shared geometry helpers for timeline label and preview positioning.

const PATH_CENTER_X = 1300;
const PATH_CENTER_Y = 1000;

/**
 * Returns the unit normal vector (nx, ny) perpendicular to the bezier tangent
 * at the node, pointing away from the path interior.
 * tx/ty: normalized tangent at the node position.
 * x/y: node world position.
 */
export function getOutwardNormal(x, y, tx, ty) {
  if (Math.abs(tx) < 0.001 && Math.abs(ty) < 0.001) {
    return { nx: 0, ny: 1 };
  }

  // Two perpendicular options
  const lx = -ty, ly =  tx;
  const rx =  ty, ry = -tx;

  // Pick the one that points away from path center
  const awayX = x - PATH_CENTER_X;
  const awayY = y - PATH_CENTER_Y;
  const dotL  = lx * awayX + ly * awayY;
  const dotR  = rx * awayX + ry * awayY;

  return dotL >= dotR ? { nx: lx, ny: ly } : { nx: rx, ny: ry };
}
