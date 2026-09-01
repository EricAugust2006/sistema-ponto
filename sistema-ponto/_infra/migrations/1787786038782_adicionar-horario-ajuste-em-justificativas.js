/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.addColumn("justificativas_ponto", {
    horario_ajuste: {
      type: "time",
    },
  });
};

export const down = (pgm) => {
  pgm.dropColumn("justificativas_ponto", "horario_ajuste");
};
