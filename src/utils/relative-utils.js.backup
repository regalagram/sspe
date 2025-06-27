"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRelativeCommand = toRelativeCommand;
exports.toAbsoluteCommand = toAbsoluteCommand;
exports.getAbsolutePositionFromPrevious = getAbsolutePositionFromPrevious;
exports.convertSubPathCoordinates = convertSubPathCoordinates;
exports.isRelativeCommand = isRelativeCommand;
exports.getRelativeCommandType = getRelativeCommandType;
exports.getAbsoluteCommandType = getAbsoluteCommandType;
exports.getSubPathFinalPosition = getSubPathFinalPosition;
exports.convertSubPathCoordinatesInContext = convertSubPathCoordinatesInContext;
exports.convertPathCoordinates = convertPathCoordinates;
exports.debugConvertPathCoordinates = debugConvertPathCoordinates;
/**
 * Converts an absolute command to a relative command
 */
function toRelativeCommand(command, previousPoint) {
    const relativeCommand = { ...command };
    switch (command.command) {
        case 'M':
            relativeCommand.command = 'm';
            if (command.x !== undefined && command.y !== undefined) {
                relativeCommand.x = command.x - previousPoint.x;
                relativeCommand.y = command.y - previousPoint.y;
            }
            break;
        case 'L':
            relativeCommand.command = 'l';
            if (command.x !== undefined && command.y !== undefined) {
                relativeCommand.x = command.x - previousPoint.x;
                relativeCommand.y = command.y - previousPoint.y;
            }
            break;
        case 'H':
            relativeCommand.command = 'h';
            if (command.x !== undefined) {
                relativeCommand.x = command.x - previousPoint.x;
            }
            break;
        case 'V':
            relativeCommand.command = 'v';
            if (command.y !== undefined) {
                relativeCommand.y = command.y - previousPoint.y;
            }
            break;
        case 'C':
            relativeCommand.command = 'c';
            if (command.x1 !== undefined && command.y1 !== undefined) {
                relativeCommand.x1 = command.x1 - previousPoint.x;
                relativeCommand.y1 = command.y1 - previousPoint.y;
            }
            if (command.x2 !== undefined && command.y2 !== undefined) {
                relativeCommand.x2 = command.x2 - previousPoint.x;
                relativeCommand.y2 = command.y2 - previousPoint.y;
            }
            if (command.x !== undefined && command.y !== undefined) {
                relativeCommand.x = command.x - previousPoint.x;
                relativeCommand.y = command.y - previousPoint.y;
            }
            break;
        case 'S':
            relativeCommand.command = 's';
            if (command.x2 !== undefined && command.y2 !== undefined) {
                relativeCommand.x2 = command.x2 - previousPoint.x;
                relativeCommand.y2 = command.y2 - previousPoint.y;
            }
            if (command.x !== undefined && command.y !== undefined) {
                relativeCommand.x = command.x - previousPoint.x;
                relativeCommand.y = command.y - previousPoint.y;
            }
            break;
        case 'Q':
            relativeCommand.command = 'q';
            if (command.x1 !== undefined && command.y1 !== undefined) {
                relativeCommand.x1 = command.x1 - previousPoint.x;
                relativeCommand.y1 = command.y1 - previousPoint.y;
            }
            if (command.x !== undefined && command.y !== undefined) {
                relativeCommand.x = command.x - previousPoint.x;
                relativeCommand.y = command.y - previousPoint.y;
            }
            break;
        case 'T':
            relativeCommand.command = 't';
            if (command.x !== undefined && command.y !== undefined) {
                relativeCommand.x = command.x - previousPoint.x;
                relativeCommand.y = command.y - previousPoint.y;
            }
            break;
        case 'A':
            relativeCommand.command = 'a';
            if (command.x !== undefined && command.y !== undefined) {
                relativeCommand.x = command.x - previousPoint.x;
                relativeCommand.y = command.y - previousPoint.y;
            }
            // rx, ry, xAxisRotation, largeArcFlag, sweepFlag remain the same
            break;
        case 'Z':
        case 'z':
            // Z and z are equivalent
            break;
    }
    return relativeCommand;
}
/**
 * Converts a relative command to an absolute command
 */
function toAbsoluteCommand(command, previousPoint) {
    const absoluteCommand = { ...command };
    switch (command.command) {
        case 'm':
            absoluteCommand.command = 'M';
            if (command.x !== undefined && command.y !== undefined) {
                absoluteCommand.x = command.x + previousPoint.x;
                absoluteCommand.y = command.y + previousPoint.y;
            }
            break;
        case 'l':
            absoluteCommand.command = 'L';
            if (command.x !== undefined && command.y !== undefined) {
                absoluteCommand.x = command.x + previousPoint.x;
                absoluteCommand.y = command.y + previousPoint.y;
            }
            break;
        case 'h':
            absoluteCommand.command = 'H';
            if (command.x !== undefined) {
                absoluteCommand.x = command.x + previousPoint.x;
            }
            break;
        case 'v':
            absoluteCommand.command = 'V';
            if (command.y !== undefined) {
                absoluteCommand.y = command.y + previousPoint.y;
            }
            break;
        case 'c':
            absoluteCommand.command = 'C';
            if (command.x1 !== undefined && command.y1 !== undefined) {
                absoluteCommand.x1 = command.x1 + previousPoint.x;
                absoluteCommand.y1 = command.y1 + previousPoint.y;
            }
            if (command.x2 !== undefined && command.y2 !== undefined) {
                absoluteCommand.x2 = command.x2 + previousPoint.x;
                absoluteCommand.y2 = command.y2 + previousPoint.y;
            }
            if (command.x !== undefined && command.y !== undefined) {
                absoluteCommand.x = command.x + previousPoint.x;
                absoluteCommand.y = command.y + previousPoint.y;
            }
            break;
        case 's':
            absoluteCommand.command = 'S';
            if (command.x2 !== undefined && command.y2 !== undefined) {
                absoluteCommand.x2 = command.x2 + previousPoint.x;
                absoluteCommand.y2 = command.y2 + previousPoint.y;
            }
            if (command.x !== undefined && command.y !== undefined) {
                absoluteCommand.x = command.x + previousPoint.x;
                absoluteCommand.y = command.y + previousPoint.y;
            }
            break;
        case 'q':
            absoluteCommand.command = 'Q';
            if (command.x1 !== undefined && command.y1 !== undefined) {
                absoluteCommand.x1 = command.x1 + previousPoint.x;
                absoluteCommand.y1 = command.y1 + previousPoint.y;
            }
            if (command.x !== undefined && command.y !== undefined) {
                absoluteCommand.x = command.x + previousPoint.x;
                absoluteCommand.y = command.y + previousPoint.y;
            }
            break;
        case 't':
            absoluteCommand.command = 'T';
            if (command.x !== undefined && command.y !== undefined) {
                absoluteCommand.x = command.x + previousPoint.x;
                absoluteCommand.y = command.y + previousPoint.y;
            }
            break;
        case 'a':
            absoluteCommand.command = 'A';
            if (command.x !== undefined && command.y !== undefined) {
                absoluteCommand.x = command.x + previousPoint.x;
                absoluteCommand.y = command.y + previousPoint.y;
            }
            // rx, ry, xAxisRotation, largeArcFlag, sweepFlag remain the same
            break;
        case 'Z':
        case 'z':
            // Z and z are equivalent
            break;
    }
    return absoluteCommand;
}
/**
 * Gets the absolute coordinates of a command considering previous position
 */
function getAbsolutePositionFromPrevious(command, previousPoint) {
    const isRelative = command.command === command.command.toLowerCase();
    if (command.x !== undefined && command.y !== undefined) {
        if (isRelative) {
            return {
                x: previousPoint.x + command.x,
                y: previousPoint.y + command.y,
            };
        }
        else {
            return {
                x: command.x,
                y: command.y,
            };
        }
    }
    // For H/h and V/v commands
    if (command.command === 'H' || command.command === 'h') {
        const x = (command.command === 'h' && command.x !== undefined)
            ? previousPoint.x + command.x
            : command.x || previousPoint.x;
        return { x, y: previousPoint.y };
    }
    if (command.command === 'V' || command.command === 'v') {
        const y = (command.command === 'v' && command.y !== undefined)
            ? previousPoint.y + command.y
            : command.y || previousPoint.y;
        return { x: previousPoint.x, y };
    }
    return previousPoint;
}
/**
 * Converts an entire subpath between absolute and relative coordinates
 */
function convertSubPathCoordinates(subPath, toRelative) {
    const convertedCommands = [];
    let currentPoint = { x: 0, y: 0 };
    for (let i = 0; i < subPath.commands.length; i++) {
        const command = subPath.commands[i];
        let convertedCommand;
        if (toRelative) {
            convertedCommand = toRelativeCommand(command, currentPoint);
        }
        else {
            convertedCommand = toAbsoluteCommand(command, currentPoint);
        }
        convertedCommands.push(convertedCommand);
        // Update current point for next iteration
        const nextPoint = getAbsolutePositionFromPrevious(command, currentPoint);
        currentPoint = nextPoint;
    }
    return {
        ...subPath,
        commands: convertedCommands,
    };
}
/**
 * Determines if a command is relative
 */
function isRelativeCommand(command) {
    return command.command === command.command.toLowerCase() && command.command !== 'z';
}
/**
 * Gets the relative version of an absolute command type
 */
function getRelativeCommandType(commandType) {
    return commandType.toLowerCase();
}
/**
 * Gets the absolute version of a relative command type
 */
function getAbsoluteCommandType(commandType) {
    return commandType.toUpperCase();
}
/**
 * Gets the final position of a subpath after all commands are executed
 * Handles edge cases for H, V, and Z commands
 */
function getSubPathFinalPosition(subPath, startPoint = { x: 0, y: 0 }) {
    let currentPoint = { ...startPoint };
    let subPathStartPoint = { ...startPoint };
    for (let i = 0; i < subPath.commands.length; i++) {
        const command = subPath.commands[i];
        // Update subpath start point for M commands
        if (command.command === 'M' || command.command === 'm') {
            const nextPoint = getAbsolutePositionFromPrevious(command, currentPoint);
            subPathStartPoint = { ...nextPoint };
            currentPoint = nextPoint;
            continue;
        }
        // Handle Z command - returns to subpath start
        if (command.command === 'Z' || command.command === 'z') {
            currentPoint = { ...subPathStartPoint };
            continue;
        }
        // Handle H command (horizontal line)
        if (command.command === 'H' || command.command === 'h') {
            if (command.x !== undefined) {
                const x = command.command === 'h' ? currentPoint.x + command.x : command.x;
                currentPoint = { x, y: currentPoint.y };
            }
            continue;
        }
        // Handle V command (vertical line)
        if (command.command === 'V' || command.command === 'v') {
            if (command.y !== undefined) {
                const y = command.command === 'v' ? currentPoint.y + command.y : command.y;
                currentPoint = { x: currentPoint.x, y };
            }
            continue;
        }
        // For other commands with coordinates, update current position
        if (command.x !== undefined && command.y !== undefined) {
            const nextPoint = getAbsolutePositionFromPrevious(command, currentPoint);
            currentPoint = nextPoint;
        }
    }
    return currentPoint;
}
/**
 * Converts an entire subpath considering its position within the full path context
 * Handles special cases for M, H, V, and Z commands
 */
function convertSubPathCoordinatesInContext(subPath, toRelative, pathStartPoint = { x: 0, y: 0 }, isFirstSubPath = true) {
    const convertedCommands = [];
    let currentPoint = { ...pathStartPoint };
    let subPathStartPoint = { ...pathStartPoint };
    for (let i = 0; i < subPath.commands.length; i++) {
        const command = subPath.commands[i];
        let convertedCommand;
        // Special handling for M command
        if (command.command === 'M' || command.command === 'm') {
            if (toRelative) {
                // Only the very first M command in the very first subpath should remain absolute
                // All other M commands (including subsequent M in first subpath) should be relative
                if (isFirstSubPath && i === 0) {
                    convertedCommand = { ...command, command: 'M' };
                }
                else {
                    convertedCommand = toRelativeCommand(command, currentPoint);
                }
            }
            else {
                convertedCommand = toAbsoluteCommand(command, currentPoint);
            }
            // Update subpath start point for M commands
            const nextPoint = getAbsolutePositionFromPrevious(command, currentPoint);
            subPathStartPoint = { ...nextPoint };
            currentPoint = nextPoint;
        }
        else if (command.command === 'Z' || command.command === 'z') {
            // Z command always stays the same and returns to subpath start
            convertedCommand = { ...command };
            currentPoint = { ...subPathStartPoint };
        }
        else if (command.command === 'H' || command.command === 'h') {
            // Handle horizontal line commands
            if (toRelative) {
                convertedCommand = toRelativeCommand(command, currentPoint);
            }
            else {
                convertedCommand = toAbsoluteCommand(command, currentPoint);
            }
            // Update current position for H commands
            if (command.x !== undefined) {
                const x = command.command === 'h' ? currentPoint.x + command.x : command.x;
                currentPoint = { x, y: currentPoint.y };
            }
        }
        else if (command.command === 'V' || command.command === 'v') {
            // Handle vertical line commands
            if (toRelative) {
                convertedCommand = toRelativeCommand(command, currentPoint);
            }
            else {
                convertedCommand = toAbsoluteCommand(command, currentPoint);
            }
            // Update current position for V commands
            if (command.y !== undefined) {
                const y = command.command === 'v' ? currentPoint.y + command.y : command.y;
                currentPoint = { x: currentPoint.x, y };
            }
        }
        else {
            // For other commands, convert normally
            if (toRelative) {
                convertedCommand = toRelativeCommand(command, currentPoint);
            }
            else {
                convertedCommand = toAbsoluteCommand(command, currentPoint);
            }
            // Update current point for next iteration
            if (command.x !== undefined && command.y !== undefined) {
                const nextPoint = getAbsolutePositionFromPrevious(command, currentPoint);
                currentPoint = nextPoint;
            }
        }
        convertedCommands.push(convertedCommand);
    }
    return {
        ...subPath,
        commands: convertedCommands,
    };
}
/**
 * Converts multiple subpaths within a path context
 */
function convertPathCoordinates(subPaths, toRelative) {
    const convertedSubPaths = [];
    let currentPathPosition = { x: 0, y: 0 };
    for (let i = 0; i < subPaths.length; i++) {
        const subPath = subPaths[i];
        const isFirstSubPath = i === 0;
        const convertedSubPath = convertSubPathCoordinatesInContext(subPath, toRelative, currentPathPosition, isFirstSubPath);
        convertedSubPaths.push(convertedSubPath);
        // Update path position for next subpath using the original subpath
        // (since the final position should be the same regardless of relative/absolute)
        currentPathPosition = getSubPathFinalPosition(subPath, currentPathPosition);
    }
    return convertedSubPaths;
}
/**
 * Debug function to test path conversion
 */
function debugConvertPathCoordinates(subPaths, toRelative) {
    console.log('=== DEBUG: Converting path coordinates ===');
    console.log('toRelative:', toRelative);
    console.log('Number of subPaths:', subPaths.length);
    const convertedSubPaths = [];
    let currentPathPosition = { x: 0, y: 0 };
    for (let i = 0; i < subPaths.length; i++) {
        const subPath = subPaths[i];
        const isFirstSubPath = i === 0;
        console.log(`\n--- SubPath ${i} (isFirst: ${isFirstSubPath}) ---`);
        console.log('Starting position:', currentPathPosition);
        console.log('Original commands:', subPath.commands.map(cmd => `${cmd.command} ${cmd.x},${cmd.y}`));
        const convertedSubPath = convertSubPathCoordinatesInContext(subPath, toRelative, currentPathPosition, isFirstSubPath);
        console.log('Converted commands:', convertedSubPath.commands.map(cmd => `${cmd.command} ${cmd.x},${cmd.y}`));
        convertedSubPaths.push(convertedSubPath);
        // Update path position for next subpath using the original subpath
        const newPosition = getSubPathFinalPosition(subPath, currentPathPosition);
        console.log('Final position:', newPosition);
        currentPathPosition = newPosition;
    }
    console.log('=== END DEBUG ===');
}
