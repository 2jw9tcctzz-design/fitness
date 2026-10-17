import type { ProgramBlock, WorkoutCode, WorkoutTemplate, WorkoutTemplateExercise } from "../types/training";

/**
 * 12-veckorsprogrammet. Passmallarna (A/B/C) är definierade en gång; blocken styr set och reps per vecka.
 * Höj PROGRAM_VERSION om programmet ändras, så att gamla backuper går att tolka.
 */
export const PROGRAM_VERSION = 1;

export const PROGRAM_BLOCKS: ProgramBlock[] = [
  {
    id: "1A",
    weekFrom: 1,
    weekTo: 2,
    name: "Block 1A",
    group: "Block 1",
    main: { sets: 2, repMin: 10, repMax: 12, rirMin: 3, rirMax: 4 },
    other: { sets: 2, repMin: 10, repMax: 12, rirMin: 3, rirMax: 4 },
    note: "Vana, teknik och bas. Hitta rimliga startvikter.",
  },
  {
    id: "1B",
    weekFrom: 3,
    weekTo: 4,
    name: "Block 1B",
    group: "Block 1",
    main: { sets: 3, repMin: 10, repMax: 12, rirMin: 2, rirMax: 3 },
    other: { sets: 2, repMin: 10, repMax: 12, rirMin: 2, rirMax: 3 },
    note: "Vana, teknik och bas. Tre set på huvudövningarna.",
  },
  {
    id: "2",
    weekFrom: 5,
    weekTo: 8,
    name: "Block 2",
    group: "Block 2",
    main: { sets: 3, repMin: 8, repMax: 12, rirMin: 2, rirMax: 2 },
    other: { sets: 3, repMin: 10, repMax: 15, rirMin: 2, rirMax: 2 },
    note: "Progressiv styrka. Ta nästa viktsteg när du nått toppen av rep-intervallet.",
  },
  {
    id: "3",
    weekFrom: 9,
    weekTo: 11,
    name: "Block 3",
    group: "Block 3",
    main: { sets: 3, repMin: 6, repMax: 10, rirMin: 1, rirMax: 2 },
    other: { sets: 3, repMin: 8, repMax: 12, rirMin: 2, rirMax: 2 },
    note: "Lite tyngre arbete utan att bli ett maxstyrkeprogram.",
  },
  {
    id: "deload",
    weekFrom: 12,
    weekTo: 12,
    name: "Deload",
    group: "Deload",
    main: { sets: 2, repMin: 8, repMax: 12, rirMin: 3, rirMax: 4 },
    other: { sets: 2, repMin: 10, repMax: 15, rirMin: 3, rirMax: 4 },
    isDeload: true,
    note: "Lättare avslutningsvecka. Använd cirka 80–90 % av vikten från vecka 11 eller en tydligt lättare ansträngning.",
  },
];

/** Vilka övningar som kan bytas mot varandra. Nyckel = movementPattern. */
export const SUBSTITUTIONS: Record<string, string[]> = {
  squat: ["Knäböj", "Goblet squat", "Leg press", "EGYM squat"],
  single_leg: ["Split squat", "Step-up", "Leg press"],
  horizontal_push: ["Bröstpress", "Hantelbänkpress", "Incline chest press"],
  hip_hinge: ["RDL", "Hantel-RDL", "Back extension"],
  horizontal_pull: ["Sittande rodd", "Cable row", "Hantelrodd"],
  hip_thrust: ["Hip thrust", "Glute bridge"],
  vertical_pull: ["Lat pulldown", "Neutral grip pulldown"],
  knee_flexion: ["Leg curl", "Liggande leg curl"],
  vertical_push: ["Shoulder press", "Hantelpress axlar"],
  glute: ["Glute abduction", "Lätt hip thrust"],
  knee_extension: ["Leg extension"],
  plank: ["Planka", "Dead bug"],
  anti_rotation: ["Pallof press"],
  carry: ["Farmer carry", "Planka"],
};

const ex = (e: Omit<WorkoutTemplateExercise, "substitutions">): WorkoutTemplateExercise => ({
  ...e,
  substitutions: SUBSTITUTIONS[e.movementPattern] ?? [e.name],
});

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "A",
    code: "A",
    name: "Fullkropp A",
    exercises: [
      ex({ id: "A1", name: "Knäböj", kind: "main", movementPattern: "squat" }),
      ex({ id: "A2", name: "Bröstpress", kind: "main", movementPattern: "horizontal_push" }),
      ex({ id: "A3", name: "RDL", kind: "main", movementPattern: "hip_hinge" }),
      ex({ id: "A4", name: "Sittande rodd", kind: "main", movementPattern: "horizontal_pull" }),
      ex({ id: "A5", name: "Hip thrust", kind: "accessory", movementPattern: "hip_thrust" }),
      ex({
        id: "A6",
        name: "Planka",
        kind: "core",
        movementPattern: "plank",
        durationSeconds: { min: 30, max: 60 },
        fixedSets: 2,
        hint: "Planka 30–60 sek eller dead bug 8–12 per sida.",
      }),
    ],
  },
  {
    id: "B",
    code: "B",
    name: "Fullkropp B",
    exercises: [
      ex({ id: "B1", name: "Split squat", kind: "main", movementPattern: "single_leg", perSide: true, hint: "Per ben där det passar." }),
      ex({ id: "B2", name: "Lat pulldown", kind: "main", movementPattern: "vertical_pull" }),
      ex({ id: "B3", name: "Leg curl", kind: "accessory", movementPattern: "knee_flexion" }),
      ex({ id: "B4", name: "Shoulder press", kind: "main", movementPattern: "vertical_push" }),
      ex({ id: "B5", name: "Glute abduction", kind: "accessory", movementPattern: "glute" }),
      ex({ id: "B6", name: "Pallof press", kind: "core", movementPattern: "anti_rotation", perSide: true, fixedSets: 2, hint: "10–12 per sida." }),
    ],
  },
  {
    id: "C",
    code: "C",
    name: "Fullkropp C",
    exercises: [
      ex({ id: "C1", name: "Goblet squat", kind: "main", movementPattern: "squat", hint: "Alternativ variant jämfört med pass A." }),
      ex({ id: "C2", name: "Incline chest press", kind: "main", movementPattern: "horizontal_push" }),
      ex({ id: "C3", name: "Back extension", kind: "main", movementPattern: "hip_hinge" }),
      ex({ id: "C4", name: "Cable row", kind: "main", movementPattern: "horizontal_pull" }),
      ex({ id: "C5", name: "Leg extension", kind: "accessory", movementPattern: "knee_extension" }),
      ex({
        id: "C6",
        name: "Farmer carry",
        kind: "core",
        movementPattern: "carry",
        durationSeconds: { min: 30, max: 45 },
        fixedSets: 2,
        hint: "2–3 rundor, eller 30–45 sek core.",
      }),
    ],
  },
];

export const WORKOUT_CODES: WorkoutCode[] = ["A", "B", "C"];

export function getTemplate(code: string): WorkoutTemplate | null {
  return WORKOUT_TEMPLATES.find((t) => t.id === code) ?? null;
}
