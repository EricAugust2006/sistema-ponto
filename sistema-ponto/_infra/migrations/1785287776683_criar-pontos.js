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
  pgm.createTable("pontos", {
    id: { type: "bigserial", primaryKey: true },
    empregado_id: {
      type: "integer",
      notNull: true,
      references: "empregados",
      onDelete: "CASCADE",
    },
    tipo: {
      type: "text",
      notNull: true,
      check: "type IN ('entrada', 'saida_almoco', 'retorno_almoco', 'saida'",
    },
    criado_em: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  pgm.createIndex("pontos", "empregado_id");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("pontos");
};
