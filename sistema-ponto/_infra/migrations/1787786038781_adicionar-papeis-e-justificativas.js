/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.addColumn("empregados", {
    papel: {
      type: "varchar(20)",
      notNull: true,
      default: "funcionario",
      check: "papel IN ('funcionario', 'gestor', 'admin')",
    },
  });

  pgm.createTable("justificativas_ponto", {
    id: { type: "bigserial", primaryKey: true },
    empregado_id: {
      type: "integer",
      notNull: true,
      references: "empregados",
      onDelete: "CASCADE",
    },
    data: { type: "date", notNull: true },
    tipo_ponto: {
      type: "text",
      notNull: true,
      check:
        "tipo_ponto IN ('entrada', 'saida_almoco', 'retorno_almoco', 'saida')",
    },
    motivo: { type: "text", notNull: true },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "pendente",
      check: "status IN ('pendente', 'aprovada', 'recusada')",
    },
    analisado_por: {
      type: "integer",
     references: "empregados",
      onDelete: "SET NULL",
    },
    observacao_analise: { type: "text" },
    criado_em: { type: "timestamp", notNull: true, default: pgm.func("now()") },
    analisado_em: { type: "timestamp" },
  });

  pgm.createIndex(
    "justificativas_ponto",
    ["empregado_id", "data", "tipo_ponto"],
    { name: "justificativa_por_ponto_unica", unique: true },
  );
};

export const down = (pgm) => {
  pgm.dropTable("justificativas_ponto");
  pgm.dropColumn("empregados", "papel");
};
