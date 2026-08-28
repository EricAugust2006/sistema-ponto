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
  pgm.addColumn("pontos", {
    data_referencia: {
      type: "date",
    },
  });

  pgm.sql(`
    UPDATE pontos
    SET data_referencia = criado_em::date
  `);

  pgm.alterColumn("pontos", "data_referencia", {
    notNull: true,
    default: pgm.func("CURRENT_DATE"),
  });

  pgm.createIndex("pontos", ["empregado_id", "tipo", "data_referencia"], {
    name: "pontos_empregado_tipo_data_referencia_unico",
    unique: true,
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex("pontos", "pontos_empregado_tipo_data_referencia_unico");
  pgm.dropColumn("pontos", "data_referencia");
};
