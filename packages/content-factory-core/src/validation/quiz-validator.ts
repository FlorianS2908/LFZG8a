export type QuizQuestion = {
  id: string;
  options: string[];
  correct: number[];
};

export function validateQuizQuestions(questions: QuizQuestion[]): string[] {
  const errors: string[] = [];
  questions.forEach((question) => {
    if (!question.options.length) errors.push(`${question.id}: keine Antwortoptionen.`);
    question.correct.forEach((index) => {
      if (!Number.isInteger(index) || index < 0 || index >= question.options.length) {
        errors.push(`${question.id}: correct-Index ${index} ist ungueltig.`);
      }
    });
  });
  return errors;
}
