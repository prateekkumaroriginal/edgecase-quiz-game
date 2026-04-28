export const DEFAULT_LEVEL_ID = "level-1";

export const LEVELS = [
  {
    id: "level-1",
    name: "Tech Field",
    worldWidth: 4300,
    floorY: 652,
    playerSpawn: {
      x: 90,
      y: 560
    },
    platforms: [
      {
        x: 2150,
        y: 684,
        width: 4300,
        height: 64
      },
      {
        x: 2150,
        y: 684,
        width: 4300,
        height: 64
      },
      {
        x: 340,
        y: 520,
        width: 220,
        height: 34
      },
      {
        x: 670,
        y: 440,
        width: 220,
        height: 34
      },
      {
        x: 1030,
        y: 535,
        width: 300,
        height: 34
      },
      {
        x: 1420,
        y: 455,
        width: 230,
        height: 34
      },
      {
        x: 1760,
        y: 555,
        width: 270,
        height: 34
      },
      {
        x: 2150,
        y: 475,
        width: 240,
        height: 34
      },
      {
        x: 2600,
        y: 548,
        width: 320,
        height: 34
      },
      {
        x: 3040,
        y: 460,
        width: 240,
        height: 34
      },
      {
        x: 3380,
        y: 540,
        width: 270,
        height: 34
      },
      {
        x: 3760,
        y: 438,
        width: 230,
        height: 34
      }
    ],
    coins: [
      {
        x: 345,
        y: 475
      },
      {
        x: 440,
        y: 475
      },
      {
        x: 640,
        y: 395
      },
      {
        x: 720,
        y: 395
      },
      {
        x: 1110,
        y: 490
      },
      {
        x: 1370,
        y: 410
      },
      {
        x: 1490,
        y: 410
      },
      {
        x: 1830,
        y: 510
      },
      {
        x: 2110,
        y: 430
      },
      {
        x: 2195,
        y: 430
      },
      {
        x: 2670,
        y: 505
      },
      {
        x: 2780,
        y: 505
      },
      {
        x: 3060,
        y: 415
      },
      {
        x: 3150,
        y: 415
      },
      {
        x: 3440,
        y: 495
      },
      {
        x: 3550,
        y: 495
      },
      {
        x: 3770,
        y: 394
      },
      {
        x: 3860,
        y: 394
      }
    ],
    hazards: [
      {
        x: 790,
        y: 638
      },
      {
        x: 830,
        y: 638
      },
      {
        x: 1580,
        y: 638
      },
      {
        x: 1620,
        y: 638
      },
      {
        x: 2860,
        y: 638
      },
      {
        x: 2900,
        y: 638
      },
      {
        x: 3320,
        y: 638
      },
      {
        x: 3980,
        y: 638
      }
    ],
    enemies: [
      {
        x: 1210,
        y: 600,
        min: 1050,
        max: 1320
      },
      {
        x: 2350,
        y: 600,
        min: 2250,
        max: 2490
      },
      {
        x: 3560,
        y: 600,
        min: 3380,
        max: 3700
      }
    ],
    challenges: [
      {
        x: 920,
        y: 585,
        width: 170,
        height: 110,
        label: "CHALLENGE 01"
      },
      {
        x: 1980,
        y: 585,
        width: 170,
        height: 110,
        label: "CHALLENGE 02"
      },
      {
        x: 3260,
        y: 585,
        width: 170,
        height: 110,
        label: "CHALLENGE 03"
      }
    ],
    merchant: {
      x: 2420,
      y: 590,
      width: 240,
      height: 120,
      npcX: 2420,
      npcY: 579
    },
    exitGate: {
      x: 4070,
      y: 582,
      width: 115,
      height: 138
    },
    signs: [
      {
        x: 90,
        y: 585,
        text: "START"
      },
      {
        x: 2240,
        y: 585,
        text: "MERCHANT SAFE ZONE"
      },
      {
        x: 3910,
        y: 585,
        text: "EXIT RUN"
      }
    ]
  },
  {
    id: "new-level",
    name: "New Level",
    worldWidth: 4300,
    floorY: 652,
    playerSpawn: {
      x: 57,
      y: 510
    },
    platforms: [
      {
        x: 2150,
        y: 684,
        width: 4300,
        height: 64
      },
      {
        x: 310,
        y: 560,
        width: 220,
        height: 30
      },
      {
        x: 910,
        y: 560,
        width: 220,
        height: 30
      },
      {
        x: 2210,
        y: 560,
        width: 220,
        height: 30
      },
      {
        x: 1890,
        y: 460,
        width: 220,
        height: 34
      },
      {
        x: 1490,
        y: 260,
        width: 220,
        height: 34
      }
    ],
    coins: [
      {
        x: 250,
        y: 520
      },
      {
        x: 370,
        y: 520
      },
      {
        x: 850,
        y: 520
      },
      {
        x: 970,
        y: 520
      },
      {
        x: 2120,
        y: 490
      },
      {
        x: 1040,
        y: 600
      },
      {
        x: 1080,
        y: 600
      },
      {
        x: 1830,
        y: 420
      },
      {
        x: 1900,
        y: 420
      },
      {
        x: 1970,
        y: 420
      }
    ],
    hazards: [
      {
        x: 1040,
        y: 640
      },
      {
        x: 1080,
        y: 640
      },
      {
        x: 2120,
        y: 530
      }
    ],
    enemies: [
      {
        x: 450,
        y: 610,
        min: 330,
        max: 570
      },
      {
        x: 1300,
        y: 610,
        min: 1180,
        max: 1420
      },
      {
        x: 1600,
        y: 610,
        min: 1480,
        max: 1720
      },
      {
        x: 1900,
        y: 610,
        min: 1780,
        max: 2020
      }
    ],
    challenges: [
      {
        x: 610,
        y: 590,
        width: 170,
        height: 110,
        label: "CHALLENGE 01",
        difficulty: "hard"
      },
      {
        x: 2590,
        y: 540,
        width: 170,
        height: 110,
        label: "CHALLENGE 02",
        difficulty: "medium"
      }
    ],
    merchant: {
      x: 3020,
      y: 590,
      width: 240,
      height: 120,
      npcX: 2870,
      npcY: 559
    },
    exitGate: {
      x: 1490,
      y: 170,
      width: 115,
      height: 138
    },
    signs: []
  },
  {
    id: "level-two",
    name: "LEVEL TWO",
    worldWidth: 4300,
    floorY: 652,
    playerSpawn: {
      x: 57,
      y: 510
    },
    platforms: [
      {
        x: 2150,
        y: 684,
        width: 4300,
        height: 64
      },
      {
        x: 310,
        y: 560,
        width: 220,
        height: 30
      },
      {
        x: 910,
        y: 560,
        width: 220,
        height: 30
      },
      {
        x: 2210,
        y: 560,
        width: 220,
        height: 30
      },
      {
        x: 1890,
        y: 460,
        width: 220,
        height: 34
      },
      {
        x: 1490,
        y: 260,
        width: 220,
        height: 34
      }
    ],
    coins: [
      {
        x: 250,
        y: 520
      },
      {
        x: 370,
        y: 520
      },
      {
        x: 850,
        y: 520
      },
      {
        x: 970,
        y: 520
      },
      {
        x: 2120,
        y: 490
      },
      {
        x: 1040,
        y: 600
      },
      {
        x: 1080,
        y: 600
      },
      {
        x: 1830,
        y: 420
      },
      {
        x: 1900,
        y: 420
      },
      {
        x: 1970,
        y: 420
      }
    ],
    hazards: [
      {
        x: 1040,
        y: 640
      },
      {
        x: 1080,
        y: 640
      },
      {
        x: 2120,
        y: 530
      }
    ],
    enemies: [
      {
        x: 450,
        y: 610,
        min: 330,
        max: 570
      },
      {
        x: 1300,
        y: 610,
        min: 1180,
        max: 1420
      },
      {
        x: 1600,
        y: 610,
        min: 1480,
        max: 1720
      },
      {
        x: 1900,
        y: 610,
        min: 1780,
        max: 2020
      }
    ],
    challenges: [
      {
        x: 610,
        y: 590,
        width: 170,
        height: 110,
        label: "CHALLENGE 01",
        difficulty: "hard"
      },
      {
        x: 2590,
        y: 540,
        width: 170,
        height: 110,
        label: "CHALLENGE 02",
        difficulty: "medium"
      }
    ],
    merchant: {
      x: 3020,
      y: 590,
      width: 240,
      height: 120,
      npcX: 2870,
      npcY: 559
    },
    exitGate: {
      x: 1490,
      y: 170,
      width: 115,
      height: 138
    },
    signs: []
  }
];
