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
  pgm.createTable("banco_horas", {
    id: { type: "bigserial", primaryKey: true },
    empregado_id: {
      type: "integer",
      notNull: true,
      references: "empregados",
      onDelete: "CASCADE",
    },
    data: { type: "date", notNull: true },
    saldo_minutos: { type: "integer", notNull: true },
    detalhes: { type: "jsonb", notNull: true },
    criado_em: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });

  pgm.createIndex("banco_horas", ["empregado_id", "data"], { unique: true });
};

export const down = (pgm) => {
  pgm.dropTable("banco_horas");
};