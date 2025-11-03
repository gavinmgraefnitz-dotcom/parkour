// levels.js
// Export levels for your FPS game

export const levels = [
    // Level 1 - Beginner
    [
        { x: 0, y: 0, z: 0, w: 50, h: 1, d: 50, color: 0x228B22 }, // Ground
        { x: 5, y: 2, z: 0, w: 4, h: 1, d: 4, color: 0x0000ff },
        { x: -5, y: 4, z: -5, w: 4, h: 1, d: 4, color: 0x0000ff },
        { x: 0, y: 6, z: 5, w: 4, h: 1, d: 4, color: 0x0000ff }
    ],
    // Level 2 - Intermediate
    [
        { x: 0, y: 0, z: 0, w: 50, h: 1, d: 50, color: 0x228B22 },
        { x: 6, y: 2, z: 0, w: 3, h: 1, d: 3, color: 0xff0000 },
        { x: 10, y: 4, z: -3, w: 4, h: 1, d: 4, color: 0xff00ff },
        { x: -8, y: 6, z: 2, w: 2, h: 1, d: 2, color: 0xffff00 },
        { x: 0, y: 8, z: 10, w: 4, h: 1, d: 4, color: 0x0000ff }
    ],
    // Level 3 - Advanced
    [
        { x: 0, y: 0, z: 0, w: 50, h: 1, d: 50, color: 0x228B22 },
        { x: -5, y: 2, z: 5, w: 2, h: 1, d: 2, color: 0xff0000 },
        { x: 5, y: 3, z: 10, w: 3, h: 1, d: 3, color: 0xffa500 },
        { x: -10, y: 5, z: 15, w: 4, h: 1, d: 4, color: 0xffff00 },
        { x: 0, y: 7, z: 20, w: 4, h: 1, d: 4, color: 0x0000ff },
        { x: 10, y: 9, z: 25, w: 3, h: 1, d: 3, color: 0xff00ff }
    ]
];
