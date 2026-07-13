/** Guardas de rota. Vivem fora do index.js para as rotas não importarem o servidor de volta. */

export const exigeLogin = async (req, reply) => {
  if (!req.usuario) return reply.code(401).send({ erro: "Você precisa entrar." });
};

export const exigeAdmin = async (req, reply) => {
  if (!req.usuario) return reply.code(401).send({ erro: "Você precisa entrar." });

  if (req.usuario.role !== "admin") {
    req.log.warn({ usuario: req.usuario.email, rota: req.url }, "acesso negado a rota de admin");
    return reply.code(403).send({ erro: "Só o administrador pode fazer isso." });
  }
};
