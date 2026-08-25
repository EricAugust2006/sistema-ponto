/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumns("empregados", {
    horario_entrada: { type: "time", notNull: true, default: "08:00:00" },
    horario_saida: { type: "time", notNull: true, default: "17:00:00" },
  });
};

export const down = (pgm) => {
  pgm.dropColumns("empregados", ["horario_entrada", "horario_saida"]);
};