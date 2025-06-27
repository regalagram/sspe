import { SVGPath, SVGCommand, SVGSubPath, Point, BoundingBox } from "../types";

export const pathToString = (path: SVGPath): string => {
  return path.subPaths
    .map((subPath) => subPathToString(subPath))
    .join(' ');
};

export const pathsToString = (paths: SVGPath[]): string => {
  return paths
    .map((path) => pathToString(path))
    .join(' ');
};

export const subPathToString = (subPath: SVGSubPath): string => {
  return subPath.commands
    .map((command) => commandToString(command))
    .join(' ');
};

export const commandToString = (command: SVGCommand): string => {
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

export const parsePathString = (d: string): SVGPath => {
  const commands = parsePathCommands(d);
  const subPaths = [];
  let currentSubPath: SVGCommand[] = [];
  
  commands.forEach((command) => {
    const cmd = command.command;
    
    if (cmd === 'M' && currentSubPath.length > 0) {
      // Start a new sub-path
      subPaths.push({
        id: `subpath-${subPaths.length}`,
        commands: currentSubPath,
      });
      currentSubPath = [command];
    } else {
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

export const parsePathCommands = (d: string): SVGCommand[] => {
  // Simple regex to parse SVG path commands
  const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  const commands: SVGCommand[] = [];
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
    } else if (command === 'H' || command === 'h') {
      for (let i = 0; i < params.length; i++) {
        commands.push({
          id: `cmd-${commands.length}`,
          command: command,
          x: params[i]
        });
      }
    } else if (command === 'V' || command === 'v') {
      for (let i = 0; i < params.length; i++) {
        commands.push({
          id: `cmd-${commands.length}`,
          command: command,
          y: params[i]
        });
      }
    } else if (command === 'C' || command === 'c') {
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
    } else if (command === 'S' || command === 's' || 
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
    } else if (command === 'T' || command === 't') {
      for (let i = 0; i < params.length; i += 2) {
        commands.push({
          id: `cmd-${commands.length}`,
          command: command,
          x: params[i],
          y: params[i + 1]
        });
      }
    } else if (command === 'A' || command === 'a') {
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
    } else if (command === 'Z' || command === 'z') {
      commands.push({
        id: `cmd-${commands.length}`,
        command: command
      });
    }
  }
  
  return commands;
};

export const getPathBounds = (path: SVGPath): BoundingBox => {
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

export const snapToGrid = (point: Point, gridSize: number): Point => {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
};

export const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const getCommandPosition = (command: SVGCommand): Point | null => {
  if (command.x !== undefined && command.y !== undefined) {
    return { x: command.x, y: command.y };
  }
  return null;
};

export const transformPoint = (point: Point, zoom: number, pan: Point): Point => {
  return {
    x: (point.x - pan.x) * zoom,
    y: (point.y - pan.y) * zoom,
  };
};

export const inverseTransformPoint = (point: Point, zoom: number, pan: Point): Point => {
  return {
    x: point.x / zoom + pan.x,
    y: point.y / zoom + pan.y,
  };
};