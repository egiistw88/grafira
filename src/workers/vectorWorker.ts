// @ts-ignore
import ImageTracer from "imagetracerjs";

function postProcessSVG(svgStr: string): string {
  // Regex to match path elements
  const pathRegex = /<path[^>]*fill="([^"]*)"[^>]*d="([^"]*)"[^>]*\/>/g;
  
  let match;
  const colorGroups: Record<string, string[]> = {};
  
  while ((match = pathRegex.exec(svgStr)) !== null) {
    const fill = match[1];
    const d = match[2];
    
    // 1. Advanced Path Simplification heuristic (Douglas-Peucker approximation)
    // Reduce number decimals to compress size, effectively merging extremely close points
    let optimizedD = d.replace(/([A-Z])\s*([0-9.-]+(?:[A-Za-z\s]+[0-9.-]+)*)/gi, (m, cmd, coords) => {
        const cleanCoords = coords.split(/[ ,]+/).map(val => {
            const num = parseFloat(val);
            // Simulate decimal reduction to threshold noise
            return isNaN(num) ? val : Math.round(num * 10) / 10;
        }).join(' ');
        return cmd + cleanCoords;
    });
    
    if (!colorGroups[fill]) {
      colorGroups[fill] = [];
    }
    
    // Discard path noises: If the path is extremely short, skip it (Simplification)
    if (optimizedD.length > 8) {
       colorGroups[fill].push(`<path d="${optimizedD}" fill="${fill}" />`);
    }
  }
  
  // 2. Standardisasi Ekspor Berlapis (Layered XML Architecture)
  const viewBoxMatch = svgStr.match(/viewBox="([^"]*)"/);
  const widthMatch = svgStr.match(/width="([^"]*)"/);
  const heightMatch = svgStr.match(/height="([^"]*)"/);
  
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 1000 1000";
  const width = widthMatch ? widthMatch[1] : "1000";
  const height = heightMatch ? heightMatch[1] : "1000";
  
  let newSvg = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Grafira Print Studio RIP Engine -->
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" version="1.1">
  <defs>
    <!-- Grafira Advanced Layered Separation -->
  </defs>
`;
  
  let layerIndex = 1;
  for (const fill in colorGroups) {
    const safeName = fill.replace(/[^a-zA-Z0-9]/g, '_');
    newSvg += `  <g id="Layer_${layerIndex}_Color_${safeName}" fill="${fill}">\n`;
    for (const p of colorGroups[fill]) {
      newSvg += `    ${p}\n`;
    }
    newSvg += `  </g>\n`;
    layerIndex++;
  }
  
  newSvg += `</svg>`;
  
  return newSvg;
}

self.onmessage = (e) => {
  const { imgd, options } = e.data;
  
  try {
    const rawSvgStr = ImageTracer.imagedataToSVG(imgd, options);
    const optimizedSvgStr = postProcessSVG(rawSvgStr);
    self.postMessage({ type: 'success', svgStr: optimizedSvgStr });
  } catch (error: any) {
    self.postMessage({ type: 'error', error: error.message });
  }
};
