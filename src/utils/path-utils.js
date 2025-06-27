"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAbsoluteControlPoints = exports.getAbsoluteCommandPosition = exports.getCommandPosition = exports.distance = exports.snapToGrid = exports.getPathBounds = exports.parsePathCommands = exports.parsePathString = exports.commandToString = exports.getContrastColor = exports.findInnermostSubPathAtPoint = exports.findSubPathAtPointAdvanced = exports.findSubPathAtPoint = exports.subPathToStringInContext = exports.subPathToString = exports.pathsToString = exports.pathToString = void 0;
const relative_utils_1 = require("./relative-utils");
const pathToString = (path) => {
    return path.subPaths
        .map((subPath) => (0, exports.subPathToString)(subPath))
        .join(' ');
};
exports.pathToString = pathToString;
const pathsToString = (paths) => {
    return paths
        .map((path) => (0, exports.pathToString)(path))
        .join(' ');
};
exports.pathsToString = pathsToString;
const subPathToString = (subPath) => {
    return subPath.commands
        .map((command) => (0, exports.commandToString)(command))
        .join(' ');
};
exports.subPathToString = subPathToString;
// Generate subpath string with context - for proper visual feedback rendering
const subPathToStringInContext = (subPath, allSubPaths) => {
    // Find the index of this subpath
    const subPathIndex = allSubPaths.findIndex(sp => sp.id === subPath.id);
    if (subPathIndex === -1) {
        // Fallback to regular string if not found in array
        return (0, exports.subPathToString)(subPath);
    }
    // Calculate the starting position for this subpath based on previous subpaths
    let startingPosition = { x: 0, y: 0 };
    for (let i = 0; i < subPathIndex; i++) {
        startingPosition = (0, relative_utils_1.getSubPathFinalPosition)(allSubPaths[i], startingPosition);
    }
    // Generate the commands string with proper context
    let currentPosition = startingPosition;
    return subPath.commands.map((command, index) => {
        const position = (0, exports.getAbsoluteCommandPosition)(command, subPath, allSubPaths);
        if (!position) {
            return (0, exports.commandToString)(command);
        }
        // For the first command of a subpath that's not the first subpath,
        // we need to ensure proper positioning
        if (index === 0 && subPathIndex > 0) {
            // If it's a relative 'm' command at the start of a non-first subpath,
            // convert it to absolute coordinates for proper rendering
            if (command.command === 'm') {
                const absoluteCommand = {
                    ...command,
                    command: 'M',
                    x: position.x,
                    y: position.y
                };
                currentPosition = position;
                return (0, exports.commandToString)(absoluteCommand);
            }
        }
        currentPosition = position;
        return (0, exports.commandToString)(command);
    }).join(' ');
};
exports.subPathToStringInContext = subPathToStringInContext;
// Function to find which subpath contains a given point
const findSubPathAtPoint = (path, point, tolerance = 15) => {
    // Collect all candidates with their distances and additional info
    const candidates = [];
    for (const subPath of path.subPaths) {
        const contourDistance = getDistanceToSubPathContour(subPath, point);
        const isInside = isPointInsideSubPath(subPath, point, 'nonzero', path.subPaths);
        const distance = getDistanceToSubPath(subPath, point, path.subPaths);
        // Only consider subpaths within tolerance or inside
        if (distance < tolerance || isInside) {
            candidates.push({
                subPath,
                distance,
                contourDistance,
                isInside
            });
        }
    }
    if (candidates.length === 0) {
        return null;
    }
    // Sort candidates by priority:
    // 1. Closest to edge (contour distance)
    // 2. Inside candidates with smallest contour distance (innermost)
    // 3. General distance
    candidates.sort((a, b) => {
        // If both are very close to edge (< 5px), choose the closest
        if (a.contourDistance < 5 && b.contourDistance < 5) {
            return a.contourDistance - b.contourDistance;
        }
        // If one is close to edge and other is inside, prefer edge
        if (a.contourDistance < 5 && b.contourDistance >= 5)
            return -1;
        if (b.contourDistance < 5 && a.contourDistance >= 5)
            return 1;
        // If both are inside, choose the one with smallest contour distance (innermost)
        if (a.isInside && b.isInside) {
            return a.contourDistance - b.contourDistance;
        }
        // If one is inside and other is not, prefer inside
        if (a.isInside && !b.isInside)
            return -1;
        if (b.isInside && !a.isInside)
            return 1;
        // Default: closest distance
        return a.distance - b.distance;
    });
    return candidates[0].subPath;
};
exports.findSubPathAtPoint = findSubPathAtPoint;
// Enhanced version of findSubPathAtPoint with configurable behavior
const findSubPathAtPointAdvanced = (path, point, options = {}) => {
    const { tolerance = 15, fillRule = 'nonzero', includeStroke = true, includeFill = true } = options;
    let closestSubPath = null;
    let minDistance = Infinity;
    for (const subPath of path.subPaths) {
        let distance = Infinity;
        // Check if point is inside the filled area (if enabled and subpath is closed)
        const isInside = includeFill && isPointInsideSubPath(subPath, point, fillRule, path.subPaths);
        if (isInside) {
            // Even if inside, calculate distance to contour for proper comparison
            // This ensures we select the innermost/closest subpath when nested
            distance = getDistanceToSubPathContour(subPath, point);
            // Give slight preference to filled areas by reducing distance slightly
            // This ensures filled detection still works but allows proper ordering
            distance = distance * 0.8; // 20% preference for filled areas
        }
        // Check distance to stroke/contour (if enabled)
        else if (includeStroke) {
            distance = getDistanceToSubPathContour(subPath, point);
        }
        if (distance < tolerance && distance < minDistance) {
            minDistance = distance;
            closestSubPath = subPath;
        }
    }
    return closestSubPath;
};
exports.findSubPathAtPointAdvanced = findSubPathAtPointAdvanced;
// Advanced function that prioritizes innermost subpaths for nested cases
const findInnermostSubPathAtPoint = (path, point, tolerance = 15) => {
    // Get all subpaths that contain the point or are within tolerance
    const candidates = [];
    for (const subPath of path.subPaths) {
        const isInside = isPointInsideSubPath(subPath, point, 'nonzero', path.subPaths);
        const distance = getDistanceToSubPathContour(subPath, point);
        if (isInside || distance < tolerance) {
            candidates.push({
                subPath,
                distance,
                isInside
            });
        }
    }
    if (candidates.length === 0) {
        return null;
    }
    // If multiple candidates are "inside", we need to find the innermost one
    const insideCandidates = candidates.filter(c => c.isInside);
    if (insideCandidates.length > 1) {
        // For nested subpaths, the innermost one typically has the smallest area
        // or the closest contour to the click point
        return insideCandidates.reduce((closest, current) => {
            if (current.distance < closest.distance) {
                return current;
            }
            // If distances are very close, prefer the one with smaller area
            if (Math.abs(current.distance - closest.distance) < 1) {
                const currentArea = calculateSubPathArea(current.subPath);
                const closestArea = calculateSubPathArea(closest.subPath);
                return currentArea < closestArea ? current : closest;
            }
            return closest;
        }).subPath;
    }
    // If only one inside or none inside, return the closest one
    return candidates.reduce((closest, current) => {
        // Prioritize inside candidates
        if (current.isInside && !closest.isInside)
            return current;
        if (!current.isInside && closest.isInside)
            return closest;
        // Among same type (both inside or both outside), choose closest
        return current.distance < closest.distance ? current : closest;
    }).subPath;
};
exports.findInnermostSubPathAtPoint = findInnermostSubPathAtPoint;
// Calculate approximate area of a subpath (for nested subpath detection)
const calculateSubPathArea = (subPath, allSubPaths) => {
    if (!isSubPathClosed(subPath, allSubPaths)) {
        return 0;
    }
    const polygonPoints = getSubPathPolygonPoints(subPath, allSubPaths);
    if (polygonPoints.length < 3) {
        return 0;
    }
    // Use shoelace formula to calculate polygon area
    let area = 0;
    const n = polygonPoints.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += polygonPoints[i].x * polygonPoints[j].y;
        area -= polygonPoints[j].x * polygonPoints[i].y;
    }
    return Math.abs(area) / 2;
};
// Helper function to calculate distance from a point to a subpath
const getDistanceToSubPath = (subPath, point, allSubPaths) => {
    // First priority: Check distance to contour/stroke for all subpaths
    const contourDistance = getDistanceToSubPathContour(subPath, point);
    // Second priority: Check if the point is inside the filled area (if closed)
    const isInside = isPointInsideSubPath(subPath, point, 'nonzero', allSubPaths);
    // Strategy: Prioritize stroke/edge detection, then fill detection
    // This ensures nested subpaths work correctly and respects fill rules
    if (contourDistance < 5) {
        // Very close to edge - immediate selection with slight preference
        return contourDistance * 0.5; // Give edge detection higher priority
    }
    if (isInside) {
        // Inside filled area - good match but lower priority than very close edges
        return 10; // Fixed moderate distance for inside points
    }
    // Outside or far from edge - return actual distance
    return contourDistance;
};
// Separated contour-only distance calculation
const getDistanceToSubPathContour = (subPath, point) => {
    let minDistance = Infinity;
    let currentPoint = { x: 0, y: 0 };
    // Process each command in the subpath for contour detection only
    for (let i = 0; i < subPath.commands.length; i++) {
        const command = subPath.commands[i];
        // Get absolute position for this command
        const absolutePos = (0, exports.getAbsoluteCommandPosition)(command, subPath);
        if (absolutePos) {
            // Distance to the endpoint of the command
            const endPointDistance = (0, exports.distance)(point, absolutePos);
            minDistance = Math.min(minDistance, endPointDistance);
            // Calculate distance to the actual curve/path segment
            if (i > 0) {
                let segmentDistance = Infinity;
                switch (command.command.toUpperCase()) {
                    case 'L':
                    case 'H':
                    case 'V':
                        segmentDistance = distanceToLineSegment(point, currentPoint, absolutePos);
                        break;
                    case 'C':
                        // Cubic Bézier curve
                        if (command.x1 !== undefined && command.y1 !== undefined &&
                            command.x2 !== undefined && command.y2 !== undefined) {
                            const controlPoints = (0, exports.getAbsoluteControlPoints)(command, subPath);
                            if (controlPoints.length >= 2) {
                                segmentDistance = distanceToCubicBezier(point, currentPoint, controlPoints[0], controlPoints[1], absolutePos);
                            }
                        }
                        break;
                    case 'S':
                        // Smooth cubic Bézier
                        if (command.x2 !== undefined && command.y2 !== undefined) {
                            const controlPoints = (0, exports.getAbsoluteControlPoints)(command, subPath);
                            if (controlPoints.length >= 1) {
                                const reflectedCP1 = getReflectedControlPoint(subPath.commands, i, currentPoint);
                                segmentDistance = distanceToCubicBezier(point, currentPoint, reflectedCP1, controlPoints[0], absolutePos);
                            }
                        }
                        break;
                    case 'Q':
                        // Quadratic Bézier curve
                        if (command.x1 !== undefined && command.y1 !== undefined) {
                            const controlPoints = (0, exports.getAbsoluteControlPoints)(command, subPath);
                            if (controlPoints.length >= 1) {
                                segmentDistance = distanceToQuadraticBezier(point, currentPoint, controlPoints[0], absolutePos);
                            }
                        }
                        break;
                    case 'T':
                        // Smooth quadratic Bézier
                        const reflectedCP = getReflectedControlPoint(subPath.commands, i, currentPoint);
                        segmentDistance = distanceToQuadraticBezier(point, currentPoint, reflectedCP, absolutePos);
                        break;
                    case 'A':
                        // Arc
                        if (command.rx !== undefined && command.ry !== undefined) {
                            segmentDistance = distanceToArc(point, currentPoint, absolutePos, command.rx, command.ry, command.xAxisRotation || 0, command.largeArcFlag || 0, command.sweepFlag || 0);
                        }
                        break;
                    default:
                        // For other commands, fall back to line segment
                        segmentDistance = distanceToLineSegment(point, currentPoint, absolutePos);
                }
                minDistance = Math.min(minDistance, segmentDistance);
            }
            currentPoint = absolutePos;
        }
    }
    return minDistance;
};
// Helper function to calculate distance from a point to a line segment
const distanceToLineSegment = (point, lineStart, lineEnd) => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    if (lenSq === 0) {
        // Line start and end are the same point
        return Math.sqrt(A * A + B * B);
    }
    let param = dot / lenSq;
    let xx, yy;
    if (param < 0) {
        xx = lineStart.x;
        yy = lineStart.y;
    }
    else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    }
    else {
        xx = lineStart.x + param * C;
        yy = lineStart.y + param * D;
    }
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
};
// Helper function to get a contrasting color for selection feedback
const getContrastColor = (color) => {
    // Handle common color formats
    if (!color || color === 'none' || color === 'transparent') {
        return '#ff4444'; // Default red for transparent/none
    }
    // Convert color to RGB values
    let r, g, b;
    if (color.startsWith('#')) {
        // Hex color
        const hex = color.slice(1);
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        }
        else if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        }
        else {
            return '#ff4444'; // Default red for invalid hex
        }
    }
    else if (color.startsWith('rgb')) {
        // RGB/RGBA color
        const match = color.match(/\d+/g);
        if (match && match.length >= 3) {
            r = parseInt(match[0]);
            g = parseInt(match[1]);
            b = parseInt(match[2]);
        }
        else {
            return '#ff4444'; // Default red for invalid rgb
        }
    }
    else {
        // Named colors - use a simple mapping for common ones
        const namedColors = {
            'black': [0, 0, 0],
            'white': [255, 255, 255],
            'red': [255, 0, 0],
            'green': [0, 128, 0],
            'blue': [0, 0, 255],
            'yellow': [255, 255, 0],
            'cyan': [0, 255, 255],
            'magenta': [255, 0, 255],
            'orange': [255, 165, 0],
            'purple': [128, 0, 128],
            'brown': [165, 42, 42],
            'pink': [255, 192, 203],
            'gray': [128, 128, 128],
            'grey': [128, 128, 128],
        };
        const colorLower = color.toLowerCase();
        if (namedColors[colorLower]) {
            [r, g, b] = namedColors[colorLower];
        }
        else {
            return '#ff4444'; // Default red for unknown named colors
        }
    }
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // Determine dominant color channel
    const maxChannel = Math.max(r, g, b);
    const isReddish = r === maxChannel;
    const isGreenish = g === maxChannel;
    const isBluish = b === maxChannel;
    // Choose contrasting color based on luminance and dominant color
    if (luminance > 0.7) {
        // Very light color - use dark contrasts
        if (isBluish)
            return '#cc3300'; // Dark red for light blue
        if (isGreenish)
            return '#6600cc'; // Dark purple for light green  
        if (isReddish)
            return '#0066cc'; // Dark blue for light red
        return '#333333'; // Dark gray for other light colors
    }
    else if (luminance > 0.3) {
        // Medium color - use bright contrasts
        if (isBluish)
            return '#ff6600'; // Bright orange for medium blue
        if (isGreenish)
            return '#ff3366'; // Bright pink for medium green
        if (isReddish)
            return '#00ccff'; // Bright cyan for medium red
        return '#ffff00'; // Bright yellow for other medium colors
    }
    else {
        // Dark color - use bright contrasts
        if (isBluish)
            return '#ffcc00'; // Bright yellow for dark blue
        if (isGreenish)
            return '#ff6699'; // Bright pink for dark green
        if (isReddish)
            return '#66ff99'; // Bright cyan-green for dark red
        return '#ffffff'; // White for other dark colors
    }
};
exports.getContrastColor = getContrastColor;
const commandToString = (command) => {
    const { id, command: cmd, ...params } = command;
    switch (cmd) {
        case 'M':
        case 'm':
        case 'L':
        case 'l':
            return `${cmd} ${params.x} ${params.y}`;
        case 'H':
        case 'h':
            return `${cmd} ${params.x}`;
        case 'V':
        case 'v':
            return `${cmd} ${params.y}`;
        case 'C':
        case 'c':
            return `${cmd} ${params.x1} ${params.y1} ${params.x2} ${params.y2} ${params.x} ${params.y}`;
        case 'S':
        case 's':
            return `${cmd} ${params.x2} ${params.y2} ${params.x} ${params.y}`;
        case 'Q':
        case 'q':
            return `${cmd} ${params.x1} ${params.y1} ${params.x} ${params.y}`;
        case 'T':
        case 't':
            return `${cmd} ${params.x} ${params.y}`;
        case 'A':
        case 'a':
            return `${cmd} ${params.rx} ${params.ry} ${params.xAxisRotation} ${params.largeArcFlag} ${params.sweepFlag} ${params.x} ${params.y}`;
        case 'Z':
        case 'z':
            return cmd;
        default:
            return '';
    }
};
exports.commandToString = commandToString;
const parsePathString = (d) => {
    const commands = (0, exports.parsePathCommands)(d);
    const subPaths = [];
    let currentSubPath = [];
    commands.forEach((command) => {
        const cmd = command.command;
        if (cmd === 'M' && currentSubPath.length > 0) {
            // Start a new sub-path
            subPaths.push({
                id: `subpath-${subPaths.length}`,
                commands: currentSubPath,
            });
            currentSubPath = [command];
        }
        else {
            currentSubPath.push(command);
        }
    });
    if (currentSubPath.length > 0) {
        subPaths.push({
            id: `subpath-${subPaths.length}`,
            commands: currentSubPath,
        });
    }
    return {
        id: `path-${Date.now()}`,
        subPaths,
        style: { fill: 'none', stroke: '#000', strokeWidth: 1 }
    };
};
exports.parsePathString = parsePathString;
const parsePathCommands = (d) => {
    // Simple regex to parse SVG path commands
    const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
    const commands = [];
    let match;
    while ((match = regex.exec(d)) !== null) {
        const command = match[1];
        const params = match[2].trim().split(/[\s,]+/).filter(p => p !== '').map(parseFloat);
        if (command === 'M' || command === 'm' ||
            command === 'L' || command === 'l') {
            for (let i = 0; i < params.length; i += 2) {
                commands.push({
                    id: `cmd-${commands.length}`,
                    command: command,
                    x: params[i],
                    y: params[i + 1]
                });
            }
        }
        else if (command === 'H' || command === 'h') {
            for (let i = 0; i < params.length; i++) {
                commands.push({
                    id: `cmd-${commands.length}`,
                    command: command,
                    x: params[i]
                });
            }
        }
        else if (command === 'V' || command === 'v') {
            for (let i = 0; i < params.length; i++) {
                commands.push({
                    id: `cmd-${commands.length}`,
                    command: command,
                    y: params[i]
                });
            }
        }
        else if (command === 'C' || command === 'c') {
            for (let i = 0; i < params.length; i += 6) {
                commands.push({
                    id: `cmd-${commands.length}`,
                    command: command,
                    x1: params[i],
                    y1: params[i + 1],
                    x2: params[i + 2],
                    y2: params[i + 3],
                    x: params[i + 4],
                    y: params[i + 5]
                });
            }
        }
        else if (command === 'S' || command === 's' ||
            command === 'Q' || command === 'q') {
            for (let i = 0; i < params.length; i += 4) {
                commands.push({
                    id: `cmd-${commands.length}`,
                    command: command,
                    x1: params[i],
                    y1: params[i + 1],
                    x: params[i + 2],
                    y: params[i + 3]
                });
            }
        }
        else if (command === 'T' || command === 't') {
            for (let i = 0; i < params.length; i += 2) {
                commands.push({
                    id: `cmd-${commands.length}`,
                    command: command,
                    x: params[i],
                    y: params[i + 1]
                });
            }
        }
        else if (command === 'A' || command === 'a') {
            for (let i = 0; i < params.length; i += 7) {
                commands.push({
                    id: `cmd-${commands.length}`,
                    command: command,
                    rx: params[i],
                    ry: params[i + 1],
                    xAxisRotation: params[i + 2],
                    largeArcFlag: params[i + 3],
                    sweepFlag: params[i + 4],
                    x: params[i + 5],
                    y: params[i + 6]
                });
            }
        }
        else if (command === 'Z' || command === 'z') {
            commands.push({
                id: `cmd-${commands.length}`,
                command: command
            });
        }
    }
    return commands;
};
exports.parsePathCommands = parsePathCommands;
const getPathBounds = (path) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    path.subPaths.forEach(subPath => {
        subPath.commands.forEach(command => {
            if (command.x !== undefined) {
                minX = Math.min(minX, command.x);
                maxX = Math.max(maxX, command.x);
            }
            if (command.y !== undefined) {
                minY = Math.min(minY, command.y);
                maxY = Math.max(maxY, command.y);
            }
            // Also check control points
            if (command.x1 !== undefined) {
                minX = Math.min(minX, command.x1);
                maxX = Math.max(maxX, command.x1);
            }
            if (command.y1 !== undefined) {
                minY = Math.min(minY, command.y1);
                maxY = Math.max(maxY, command.y1);
            }
            if (command.x2 !== undefined) {
                minX = Math.min(minX, command.x2);
                maxX = Math.max(maxX, command.x2);
            }
            if (command.y2 !== undefined) {
                minY = Math.min(minY, command.y2);
                maxY = Math.max(maxY, command.y2);
            }
        });
    });
    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
};
exports.getPathBounds = getPathBounds;
const snapToGrid = (point, gridSize) => {
    return {
        x: Math.round(point.x / gridSize) * gridSize,
        y: Math.round(point.y / gridSize) * gridSize,
    };
};
exports.snapToGrid = snapToGrid;
const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};
exports.distance = distance;
const getCommandPosition = (command) => {
    if (command.x !== undefined && command.y !== undefined) {
        return { x: command.x, y: command.y };
    }
    return null;
};
exports.getCommandPosition = getCommandPosition;
/**
 * Gets the absolute position of a command within its subpath context
 * This correctly handles relative commands by calculating cumulative positions
 * Now also considers the subpath's position within the full path
 */
const getAbsoluteCommandPosition = (command, subPath, allSubPaths) => {
    if (command.x === undefined || command.y === undefined) {
        return null;
    }
    // Find the index of this command in the subpath
    const commandIndex = subPath.commands.findIndex(cmd => cmd.id === command.id);
    if (commandIndex === -1) {
        return null;
    }
    // Calculate the starting position of this subpath within the full path
    let pathStartPosition = { x: 0, y: 0 };
    if (allSubPaths) {
        const subPathIndex = allSubPaths.findIndex(sp => sp.id === subPath.id);
        if (subPathIndex > 0) {
            // Calculate cumulative position from all previous subpaths
            for (let i = 0; i < subPathIndex; i++) {
                pathStartPosition = (0, relative_utils_1.getSubPathFinalPosition)(allSubPaths[i], pathStartPosition);
            }
        }
    }
    // Calculate absolute position by tracking through all previous commands in this subpath
    let currentX = pathStartPosition.x;
    let currentY = pathStartPosition.y;
    for (let i = 0; i <= commandIndex; i++) {
        const cmd = subPath.commands[i];
        const isRelative = cmd.command === cmd.command.toLowerCase() && cmd.command !== 'z';
        if (cmd.x !== undefined && cmd.y !== undefined) {
            if (cmd.command === 'M' || cmd.command === 'm') {
                // Special handling for M/m commands
                if (i === 0) {
                    // First command in subpath - m is relative to pathStartPosition
                    if (isRelative) {
                        currentX = pathStartPosition.x + cmd.x;
                        currentY = pathStartPosition.y + cmd.y;
                    }
                    else {
                        currentX = cmd.x;
                        currentY = cmd.y;
                    }
                }
                else {
                    // Subsequent M/m commands within the same subpath
                    if (isRelative) {
                        currentX += cmd.x;
                        currentY += cmd.y;
                    }
                    else {
                        currentX = cmd.x;
                        currentY = cmd.y;
                    }
                }
            }
            else {
                // Other commands (L, C, Q, etc.)
                if (isRelative) {
                    currentX += cmd.x;
                    currentY += cmd.y;
                }
                else {
                    currentX = cmd.x;
                    currentY = cmd.y;
                }
            }
        }
        else if (cmd.command === 'H' || cmd.command === 'h') {
            // Horizontal line
            if (cmd.x !== undefined) {
                if (isRelative) {
                    currentX += cmd.x;
                }
                else {
                    currentX = cmd.x;
                }
            }
        }
        else if (cmd.command === 'V' || cmd.command === 'v') {
            // Vertical line
            if (cmd.y !== undefined) {
                if (isRelative) {
                    currentY += cmd.y;
                }
                else {
                    currentY = cmd.y;
                }
            }
        }
    }
    return { x: currentX, y: currentY };
};
exports.getAbsoluteCommandPosition = getAbsoluteCommandPosition;
/**
 * Gets all absolute control point positions for a command within its subpath context
 * Now also considers the subpath's position within the full path
 */
const getAbsoluteControlPoints = (command, subPath, allSubPaths) => {
    const controlPoints = [];
    // First get the absolute position of the current command
    const commandIndex = subPath.commands.findIndex(cmd => cmd.id === command.id);
    if (commandIndex === -1) {
        return controlPoints;
    }
    // Calculate the starting position of this subpath within the full path
    let pathStartPosition = { x: 0, y: 0 };
    if (allSubPaths) {
        const subPathIndex = allSubPaths.findIndex(sp => sp.id === subPath.id);
        if (subPathIndex > 0) {
            // Calculate cumulative position from all previous subpaths
            for (let i = 0; i < subPathIndex; i++) {
                pathStartPosition = (0, relative_utils_1.getSubPathFinalPosition)(allSubPaths[i], pathStartPosition);
            }
        }
    }
    // Calculate the current absolute position (position before this command)
    let currentX = pathStartPosition.x;
    let currentY = pathStartPosition.y;
    for (let i = 0; i < commandIndex; i++) {
        const cmd = subPath.commands[i];
        const isRelative = cmd.command === cmd.command.toLowerCase();
        if (cmd.x !== undefined && cmd.y !== undefined) {
            if (isRelative && i > 0) {
                currentX += cmd.x;
                currentY += cmd.y;
            }
            else {
                currentX = cmd.x;
                currentY = cmd.y;
            }
        }
        else if (cmd.command === 'H' || cmd.command === 'h') {
            if (cmd.x !== undefined) {
                if (isRelative) {
                    currentX += cmd.x;
                }
                else {
                    currentX = cmd.x;
                }
            }
        }
        else if (cmd.command === 'V' || cmd.command === 'v') {
            if (cmd.y !== undefined) {
                if (isRelative) {
                    currentY += cmd.y;
                }
                else {
                    currentY = cmd.y;
                }
            }
        }
    }
    const isRelative = command.command === command.command.toLowerCase();
    // Add control points based on command type
    if (command.x1 !== undefined && command.y1 !== undefined) {
        const x1 = isRelative ? currentX + command.x1 : command.x1;
        const y1 = isRelative ? currentY + command.y1 : command.y1;
        controlPoints.push({ x: x1, y: y1 });
    }
    if (command.x2 !== undefined && command.y2 !== undefined) {
        const x2 = isRelative ? currentX + command.x2 : command.x2;
        const y2 = isRelative ? currentY + command.y2 : command.y2;
        controlPoints.push({ x: x2, y: y2 });
    }
    return controlPoints;
};
exports.getAbsoluteControlPoints = getAbsoluteControlPoints;
// Helper function to calculate distance from a point to a cubic Bézier curve
const distanceToCubicBezier = (point, p0, p1, p2, p3) => {
    let minDistance = Infinity;
    const steps = 50; // Number of points to sample along the curve
    for (let t = 0; t <= 1; t += 1 / steps) {
        // Calculate point on Bézier curve using De Casteljau's algorithm
        const curvePoint = cubicBezierPoint(p0, p1, p2, p3, t);
        const dist = (0, exports.distance)(point, curvePoint);
        minDistance = Math.min(minDistance, dist);
    }
    return minDistance;
};
// Helper function to calculate distance from a point to a quadratic Bézier curve
const distanceToQuadraticBezier = (point, p0, p1, p2) => {
    let minDistance = Infinity;
    const steps = 50; // Number of points to sample along the curve
    for (let t = 0; t <= 1; t += 1 / steps) {
        // Calculate point on quadratic Bézier curve
        const curvePoint = quadraticBezierPoint(p0, p1, p2, t);
        const dist = (0, exports.distance)(point, curvePoint);
        minDistance = Math.min(minDistance, dist);
    }
    return minDistance;
};
// Helper function to calculate distance from a point to an arc
const distanceToArc = (point, start, end, rx, ry, xAxisRotation, largeArcFlag, sweepFlag) => {
    let minDistance = Infinity;
    const steps = 50; // Number of points to sample along the arc
    // Convert SVG arc parameters to center parameterization
    const arcParams = convertToArcCenter(start, end, rx, ry, xAxisRotation, largeArcFlag, sweepFlag);
    if (!arcParams) {
        // Fallback to line segment if arc conversion fails
        return distanceToLineSegment(point, start, end);
    }
    const { cx, cy, startAngle, endAngle, rx: actualRx, ry: actualRy } = arcParams;
    // Sample points along the arc
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        let angle;
        if (sweepFlag === 1) {
            // Positive direction
            angle = startAngle + t * (endAngle - startAngle);
        }
        else {
            // Negative direction
            angle = startAngle - t * (startAngle - endAngle);
        }
        // Calculate point on ellipse
        const cos_angle = Math.cos(angle);
        const sin_angle = Math.sin(angle);
        const cos_rotation = Math.cos(xAxisRotation * Math.PI / 180);
        const sin_rotation = Math.sin(xAxisRotation * Math.PI / 180);
        const x = cx + actualRx * cos_angle * cos_rotation - actualRy * sin_angle * sin_rotation;
        const y = cy + actualRx * cos_angle * sin_rotation + actualRy * sin_angle * cos_rotation;
        const arcPoint = { x, y };
        const dist = (0, exports.distance)(point, arcPoint);
        minDistance = Math.min(minDistance, dist);
    }
    return minDistance;
};
// Convert SVG arc parameters to center parameterization
const convertToArcCenter = (start, end, rx, ry, xAxisRotation, largeArcFlag, sweepFlag) => {
    // Handle degenerate cases
    if (rx === 0 || ry === 0)
        return null;
    if (start.x === end.x && start.y === end.y)
        return null;
    const phi = xAxisRotation * Math.PI / 180;
    const cos_phi = Math.cos(phi);
    const sin_phi = Math.sin(phi);
    // Step 1: Compute (x1', y1')
    const dx = (start.x - end.x) / 2;
    const dy = (start.y - end.y) / 2;
    const x1_prime = cos_phi * dx + sin_phi * dy;
    const y1_prime = -sin_phi * dx + cos_phi * dy;
    // Ensure radii are large enough
    const rx_sq = rx * rx;
    const ry_sq = ry * ry;
    const x1_prime_sq = x1_prime * x1_prime;
    const y1_prime_sq = y1_prime * y1_prime;
    const lambda = x1_prime_sq / rx_sq + y1_prime_sq / ry_sq;
    if (lambda > 1) {
        const sqrt_lambda = Math.sqrt(lambda);
        rx *= sqrt_lambda;
        ry *= sqrt_lambda;
    }
    // Step 2: Compute (cx', cy')
    const sign = largeArcFlag === sweepFlag ? -1 : 1;
    const sq = Math.max(0, (rx_sq * ry_sq - rx_sq * y1_prime_sq - ry_sq * x1_prime_sq) / (rx_sq * y1_prime_sq + ry_sq * x1_prime_sq));
    const coeff = sign * Math.sqrt(sq);
    const cx_prime = coeff * (rx * y1_prime / ry);
    const cy_prime = coeff * -(ry * x1_prime / rx);
    // Step 3: Compute (cx, cy)
    const cx = cos_phi * cx_prime - sin_phi * cy_prime + (start.x + end.x) / 2;
    const cy = sin_phi * cx_prime + cos_phi * cy_prime + (start.y + end.y) / 2;
    // Step 4: Compute angles
    const startAngle = Math.atan2((y1_prime - cy_prime) / ry, (x1_prime - cx_prime) / rx);
    const endAngle = Math.atan2((-y1_prime - cy_prime) / ry, (-x1_prime - cx_prime) / rx);
    return {
        cx,
        cy,
        startAngle,
        endAngle,
        rx,
        ry
    };
};
// Calculate a point on a cubic Bézier curve at parameter t
const cubicBezierPoint = (p0, p1, p2, p3, t) => {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    return {
        x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
        y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    };
};
// Calculate a point on a quadratic Bézier curve at parameter t
const quadraticBezierPoint = (p0, p1, p2, t) => {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    return {
        x: mt2 * p0.x + 2 * mt * t * p1.x + t2 * p2.x,
        y: mt2 * p0.y + 2 * mt * t * p1.y + t2 * p2.y
    };
};
// Get reflected control point for smooth curves (S and T commands)
const getReflectedControlPoint = (commands, currentIndex, currentPoint) => {
    if (currentIndex <= 0) {
        return currentPoint;
    }
    const prevCommand = commands[currentIndex - 1];
    const prevCommandType = prevCommand.command.toUpperCase();
    // For S command, reflect the second control point of the previous C command
    if (prevCommandType === 'C' && prevCommand.x2 !== undefined && prevCommand.y2 !== undefined) {
        const prevAbsolutePos = (0, exports.getAbsoluteCommandPosition)(prevCommand, { commands, id: '' });
        if (prevAbsolutePos) {
            return {
                x: 2 * prevAbsolutePos.x - prevCommand.x2,
                y: 2 * prevAbsolutePos.y - prevCommand.y2
            };
        }
    }
    // For T command, reflect the control point of the previous Q command
    if (prevCommandType === 'Q' && prevCommand.x1 !== undefined && prevCommand.y1 !== undefined) {
        const prevAbsolutePos = (0, exports.getAbsoluteCommandPosition)(prevCommand, { commands, id: '' });
        if (prevAbsolutePos) {
            return {
                x: 2 * prevAbsolutePos.x - prevCommand.x1,
                y: 2 * prevAbsolutePos.y - prevCommand.y1
            };
        }
    }
    return currentPoint;
};
// Helper function to check if a point is inside a subpath using fill rules
const isPointInsideSubPath = (subPath, point, fillRule = 'nonzero', allSubPaths) => {
    // First, check if the subpath is closed (has a Z command or ends where it starts)
    const isClosed = isSubPathClosed(subPath, allSubPaths);
    // If not closed, only use contour detection
    if (!isClosed) {
        return false;
    }
    // Get all points that form the polygon
    const polygonPoints = getSubPathPolygonPoints(subPath, allSubPaths);
    if (polygonPoints.length < 3) {
        return false; // Need at least 3 points to form an area
    }
    // Use the appropriate fill rule algorithm
    let result;
    if (fillRule === 'evenodd') {
        result = isPointInsidePolygonEvenOdd(point, polygonPoints);
    }
    else {
        result = isPointInsidePolygonNonZero(point, polygonPoints);
    }
    return result;
};
// Check if a subpath is closed
const isSubPathClosed = (subPath, allSubPaths) => {
    if (subPath.commands.length === 0)
        return false;
    // Check for explicit Z command
    const lastCommand = subPath.commands[subPath.commands.length - 1];
    if (lastCommand.command.toLowerCase() === 'z') {
        return true;
    }
    // Check if the path ends where it starts
    const firstCommand = subPath.commands[0];
    const lastPosition = (0, exports.getAbsoluteCommandPosition)(lastCommand, subPath, allSubPaths);
    const firstPosition = (0, exports.getAbsoluteCommandPosition)(firstCommand, subPath, allSubPaths);
    if (firstPosition && lastPosition) {
        const threshold = 1; // Allow small tolerance for floating point errors
        return (0, exports.distance)(firstPosition, lastPosition) < threshold;
    }
    return false;
};
// Extract polygon points from a subpath (approximating curves)
const getSubPathPolygonPoints = (subPath, allSubPaths) => {
    const points = [];
    let currentPoint = { x: 0, y: 0 };
    for (let i = 0; i < subPath.commands.length; i++) {
        const command = subPath.commands[i];
        const absolutePos = (0, exports.getAbsoluteCommandPosition)(command, subPath, allSubPaths);
        if (!absolutePos)
            continue;
        switch (command.command.toUpperCase()) {
            case 'M':
            case 'L':
            case 'H':
            case 'V':
                points.push(absolutePos);
                break;
            case 'C':
                // For cubic Bézier, sample points along the curve
                if (command.x1 !== undefined && command.y1 !== undefined &&
                    command.x2 !== undefined && command.y2 !== undefined) {
                    const controlPoints = (0, exports.getAbsoluteControlPoints)(command, subPath);
                    if (controlPoints.length >= 2) {
                        const curvePoints = sampleCubicBezier(currentPoint, controlPoints[0], controlPoints[1], absolutePos, 10);
                        points.push(...curvePoints);
                    }
                }
                break;
            case 'S':
                // Smooth cubic Bézier
                if (command.x2 !== undefined && command.y2 !== undefined) {
                    const controlPoints = (0, exports.getAbsoluteControlPoints)(command, subPath);
                    if (controlPoints.length >= 1) {
                        const reflectedCP1 = getReflectedControlPoint(subPath.commands, i, currentPoint);
                        const curvePoints = sampleCubicBezier(currentPoint, reflectedCP1, controlPoints[0], absolutePos, 10);
                        points.push(...curvePoints);
                    }
                }
                break;
            case 'Q':
                // Quadratic Bézier
                if (command.x1 !== undefined && command.y1 !== undefined) {
                    const controlPoints = (0, exports.getAbsoluteControlPoints)(command, subPath);
                    if (controlPoints.length >= 1) {
                        const curvePoints = sampleQuadraticBezier(currentPoint, controlPoints[0], absolutePos, 10);
                        points.push(...curvePoints);
                    }
                }
                break;
            case 'T':
                // Smooth quadratic Bézier
                const reflectedCP = getReflectedControlPoint(subPath.commands, i, currentPoint);
                const curvePoints = sampleQuadraticBezier(currentPoint, reflectedCP, absolutePos, 10);
                points.push(...curvePoints);
                break;
            case 'A':
                // Arc - sample points along the arc
                if (command.rx !== undefined && command.ry !== undefined) {
                    const arcPoints = sampleArc(currentPoint, absolutePos, command.rx, command.ry, command.xAxisRotation || 0, command.largeArcFlag || 0, command.sweepFlag || 0, 10);
                    points.push(...arcPoints);
                }
                break;
            case 'Z':
                // Close path - don't add point as it should connect to start
                break;
        }
        currentPoint = absolutePos;
    }
    return points;
};
// Sample points along a cubic Bézier curve
const sampleCubicBezier = (p0, p1, p2, p3, steps) => {
    const points = [];
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        points.push(cubicBezierPoint(p0, p1, p2, p3, t));
    }
    return points;
};
// Sample points along a quadratic Bézier curve
const sampleQuadraticBezier = (p0, p1, p2, steps) => {
    const points = [];
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        points.push(quadraticBezierPoint(p0, p1, p2, t));
    }
    return points;
};
// Sample points along an arc
const sampleArc = (start, end, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, steps) => {
    const points = [];
    const arcParams = convertToArcCenter(start, end, rx, ry, xAxisRotation, largeArcFlag, sweepFlag);
    if (!arcParams) {
        // Fallback to linear interpolation
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            points.push({
                x: start.x + (end.x - start.x) * t,
                y: start.y + (end.y - start.y) * t
            });
        }
        return points;
    }
    const { cx, cy, startAngle, endAngle, rx: actualRx, ry: actualRy } = arcParams;
    const cos_rotation = Math.cos(xAxisRotation * Math.PI / 180);
    const sin_rotation = Math.sin(xAxisRotation * Math.PI / 180);
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        let angle;
        if (sweepFlag === 1) {
            angle = startAngle + t * (endAngle - startAngle);
        }
        else {
            angle = startAngle - t * (startAngle - endAngle);
        }
        const cos_angle = Math.cos(angle);
        const sin_angle = Math.sin(angle);
        const x = cx + actualRx * cos_angle * cos_rotation - actualRy * sin_angle * sin_rotation;
        const y = cy + actualRx * cos_angle * sin_rotation + actualRy * sin_angle * cos_rotation;
        points.push({ x, y });
    }
    return points;
};
// Point-in-polygon test using even-odd rule
const isPointInsidePolygonEvenOdd = (point, polygon) => {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;
        if (((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
};
// Point-in-polygon test using non-zero winding rule
const isPointInsidePolygonNonZero = (point, polygon) => {
    let winding = 0;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;
        if (yi <= point.y) {
            if (yj > point.y) {
                // Upward crossing
                if (isLeft(polygon[i], polygon[j], point) > 0) {
                    winding++;
                }
            }
        }
        else {
            if (yj <= point.y) {
                // Downward crossing
                if (isLeft(polygon[i], polygon[j], point) < 0) {
                    winding--;
                }
            }
        }
    }
    return winding !== 0;
};
// Helper function to determine if point is left of line
const isLeft = (p0, p1, p2) => {
    return (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
};
