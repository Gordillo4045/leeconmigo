import {
  ReadingText,
  ComprehensionQuestion,
  InferenceStatement,
  VocabularyPair,
  SequenceItem,
} from "./types";

export const mockText: ReadingText = {
  id: "text-1",
  title: "El viaje de la mariposa",
  content: `Había una vez una pequeña oruga llamada Luna que vivía en un jardín lleno de flores de colores. Luna pasaba sus días comiendo hojas verdes y jugosas, soñando con el día en que pudiera volar como las mariposas que veía pasar sobre su cabeza.

Un día, Luna sintió algo especial dentro de ella. Su cuerpo le decía que era el momento de hacer algo diferente. Con mucho cuidado, comenzó a tejer un capullo suave y brillante alrededor de su cuerpo. Dentro del capullo, Luna durmió durante muchos días.

Cuando despertó, Luna se sentía diferente. Ya no era una oruga pequeña y lenta. ¡Ahora tenía alas hermosas de colores brillantes! Luna era una mariposa. Con mucha emoción, extendió sus alas y voló por primera vez sobre el jardín.

Desde lo alto, Luna podía ver todo el jardín: las flores rojas, amarillas y moradas, los árboles grandes y el pequeño arroyo que cruzaba por el medio. Luna se dio cuenta de que el mundo era mucho más grande y hermoso de lo que imaginaba cuando era una oruga.

Luna voló de flor en flor, probando el dulce néctar y haciendo nuevos amigos entre las otras mariposas. Aprendió que cambiar puede dar miedo al principio, pero los cambios nos ayudan a descubrir cosas maravillosas sobre nosotros mismos y el mundo que nos rodea.`,
  gradeLevel: 3,
  wordCount: 210,
  estimatedReadingTime: 180,
};

export const mockComprehensionQuestions: ComprehensionQuestion[] = [
  {
    id: "q1",
    textId: "text-1",
    question: "¿Cómo se llamaba la oruga?",
    options: ["Estrella", "Luna", "Sol", "Nube"],
    correctAnswerIndex: 1,
    order: 1,
  },
  {
    id: "q2",
    textId: "text-1",
    question: "¿Qué comía Luna cuando era oruga?",
    options: ["Flores", "Frutas", "Hojas verdes", "Semillas"],
    correctAnswerIndex: 2,
    order: 2,
  },
  {
    id: "q3",
    textId: "text-1",
    question: "¿Qué hizo Luna antes de convertirse en mariposa?",
    options: [
      "Se fue a dormir en una hoja",
      "Tejió un capullo",
      "Nadó en el arroyo",
      "Subió a un árbol",
    ],
    correctAnswerIndex: 1,
    order: 3,
  },
  {
    id: "q4",
    textId: "text-1",
    question: "¿De qué colores eran las flores del jardín?",
    options: [
      "Azules, verdes y blancas",
      "Rojas, amarillas y moradas",
      "Rosas, naranjas y negras",
      "Solo eran rojas",
    ],
    correctAnswerIndex: 1,
    order: 4,
  },
  {
    id: "q5",
    textId: "text-1",
    question: "¿Qué aprendió Luna al final?",
    options: [
      "Que volar es difícil",
      "Que los cambios nos ayudan a descubrir cosas maravillosas",
      "Que ser oruga es mejor",
      "Que el jardín es pequeño",
    ],
    correctAnswerIndex: 1,
    order: 5,
  },
];

export const mockInferenceStatements: InferenceStatement[] = [
  {
    id: "inf1",
    textId: "text-1",
    statement: "Luna se sentía triste cuando era oruga porque no podía volar.",
    contextFragment:
      "Luna pasaba sus días comiendo hojas verdes y jugosas, soñando con el día en que pudiera volar como las mariposas.",
    correctAnswer: "indeterminado",
    order: 1,
  },
  {
    id: "inf2",
    textId: "text-1",
    statement: "El capullo que tejió Luna era de color oscuro y áspero.",
    contextFragment:
      "Con mucho cuidado, comenzó a tejer un capullo suave y brillante alrededor de su cuerpo.",
    correctAnswer: "falso",
    order: 2,
  },
  {
    id: "inf3",
    textId: "text-1",
    statement:
      "Después de salir del capullo, Luna podía ver más cosas que antes.",
    contextFragment:
      "Desde lo alto, Luna podía ver todo el jardín: las flores rojas, amarillas y moradas, los árboles grandes y el pequeño arroyo.",
    correctAnswer: "verdadero",
    order: 3,
  },
  {
    id: "inf4",
    textId: "text-1",
    statement: "Luna fue la única mariposa en el jardín.",
    contextFragment:
      "Luna voló de flor en flor, probando el dulce néctar y haciendo nuevos amigos entre las otras mariposas.",
    correctAnswer: "falso",
    order: 4,
  },
];

export const mockVocabularyPairs: VocabularyPair[] = [
  {
    id: "v1",
    textId: "text-1",
    word: "Capullo",
    definition: "Envoltura que protege a la oruga mientras se transforma",
    order: 1,
  },
  {
    id: "v2",
    textId: "text-1",
    word: "Néctar",
    definition: "Líquido dulce que producen las flores",
    order: 2,
  },
  {
    id: "v3",
    textId: "text-1",
    word: "Arroyo",
    definition: "Corriente pequeña de agua",
    order: 3,
  },
  {
    id: "v4",
    textId: "text-1",
    word: "Tejer",
    definition: "Crear algo entrelazando hilos o fibras",
    order: 4,
  },
  {
    id: "v5",
    textId: "text-1",
    word: "Emoción",
    definition: "Sentimiento intenso de alegría o sorpresa",
    order: 5,
  },
];

export const mockSequenceItems: SequenceItem[] = [
  {
    id: "s1",
    textId: "text-1",
    text: "Luna vivía como oruga comiendo hojas en el jardín.",
    correctOrder: 1,
  },
  {
    id: "s2",
    textId: "text-1",
    text: "Luna sintió que era momento de hacer algo diferente.",
    correctOrder: 2,
  },
  {
    id: "s3",
    textId: "text-1",
    text: "Luna tejió un capullo suave y brillante.",
    correctOrder: 3,
  },
  {
    id: "s4",
    textId: "text-1",
    text: "Luna durmió muchos días dentro del capullo.",
    correctOrder: 4,
  },
  {
    id: "s5",
    textId: "text-1",
    text: "Luna despertó convertida en una mariposa con alas de colores.",
    correctOrder: 5,
  },
  {
    id: "s6",
    textId: "text-1",
    text: "Luna voló por el jardín y conoció otras mariposas.",
    correctOrder: 6,
  },
];
