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
  pgm.createTable("sessoes", {
    id: {
      type: "serial",
      primaryKey: true,
    },
    token: {
      type: "text",
      notNull: true,
    },
    empregado_id: {
      type: "integer",
      notNull: true,
      references: "empregados",
      onDelete: "CASCADE",
    },
    criado_em: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
    },
    expira_em: {
      type: "timestamp",
      notNull: true,
    },
  });
  pgm.createIndex("sessoes", "token", { unique: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("seessoes");
};
