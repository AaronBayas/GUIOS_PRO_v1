"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
  console.log("Iniciando seed de GUIOS PRO v2...");
  // Limpiar datos anteriores para que cada ejecución refleje el seed actual.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "historial_cambio", "ai_recomendacion", "evaluacion_subfactor", "evaluacion_factor", "evaluacion_colaborador", "factor_version", "evaluacion", "subfactor", "factor", "dimension", "usuario", "rol" RESTART IDENTITY CASCADE',
  );
  // ── ROLES ──────────────────────────────────────────────────────
  const rolAdmin = await prisma.rol.upsert({
    where: { rol_name: "Administrador" },
    update: {},
    create: { rol_name: "Administrador" },
  });
  const rolEvaluador = await prisma.rol.upsert({
    where: { rol_name: "Evaluador" },
    update: {},
    create: { rol_name: "Evaluador" },
  });
  console.log("Roles creados");
  // ── USUARIO ADMIN POR DEFECTO ───────────────────────────────────
  const passwordHash = await bcryptjs_1.default.hash("Admin1234!", 12);
  await prisma.usuario.upsert({
    where: { email: "admin@guios.pro" },
    update: {},
    create: {
      rol_id: rolAdmin.rol_id,
      usuario_name: "Administrador GUIOS",
      email: "admin@guios.pro",
      password_hash: passwordHash,
      activo: true,
    },
  });
  console.log("Usuario admin creado: admin@guios.pro / Admin1234!");
  // ── DIMENSIONES ─────────────────────────────────────────────────
  const dimTec = await prisma.dimension.upsert({
    where: { dimension_name: "Tecnológica" },
    update: {},
    create: { dimension_name: "Tecnológica", orden: 1 },
  });
  const dimOrg = await prisma.dimension.upsert({
    where: { dimension_name: "Organizacional" },
    update: {},
    create: { dimension_name: "Organizacional", orden: 2 },
  });
  const dimEco = await prisma.dimension.upsert({
    where: { dimension_name: "Económica" },
    update: {},
    create: { dimension_name: "Económica", orden: 3 },
  });
  console.log("Dimensiones creadas");
  // ── FACTORES Y SUBFACTORES ──────────────────────────────────────
  // Formato: { factor, subfactores: [{ nombre, critico }] }
  const factoresData = [
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: "Compatibilidad",
        tipo_impacto: "Externo",
        importancia_sugerida: 4,
        orden: 1,
        descripcion:
          "Evalúa la capacidad del software para integrarse con infraestructuras, sistemas, formatos y hardware existentes sin fricciones significativas.",
      },
      subfactores: [
        {
          nombre:
            "Una empresa proporciona una infraestructura de nube lista para usar para este software",
          critico: false,
        },
        {
          nombre:
            "Los programas informáticos pueden exportar formatos propietarios",
          critico: false,
        },
        {
          nombre:
            "El software interactúa y se integra con el software propietario existente",
          critico: false,
        },
        {
          nombre:
            "El software está certificado para operar en su nicho de mercado",
          critico: false,
        },
        {
          nombre:
            "El software es compatible con los casos de uso y las funcionalidades más comunes",
          critico: false,
        },
        {
          nombre:
            "El software es compatible con múltiples componentes de hardware",
          critico: false,
        },
        { nombre: "El software utiliza formatos estándar", critico: false },
        {
          nombre:
            "El software es compatible con varios sistemas operativos diferentes (el software es multiplataforma)",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: "Personalización",
        tipo_impacto: "Externo",
        importancia_sugerida: 4,
        orden: 2,
        descripcion:
          "Evalúa la facilidad con la que el software puede adaptarse, ampliarse o modificarse para cubrir necesidades específicas de la organización.",
      },
      subfactores: [
        {
          nombre:
            "El acceso al código fuente es un incentivo para la organización",
          critico: false,
        },
        {
          nombre:
            "El software se puede ampliar fácilmente para satisfacer las necesidades de la organización modificando el código fuente",
          critico: false,
        },
        {
          nombre:
            "Las innovaciones se introducen en el software a un ritmo rápido",
          critico: false,
        },
        {
          nombre:
            "El software es fácil de personalizar sin necesidad de modificar el código fuente",
          critico: false,
        },
        {
          nombre:
            "El software soporta nuevas funciones a través de módulos (el software es modular)",
          critico: false,
        },
        {
          nombre:
            "Hay un repositorio público de extensiones para este software",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: "Prueba",
        tipo_impacto: "Externo",
        importancia_sugerida: 4,
        orden: 3,
        descripcion:
          "Evalúa qué tan sencillo es desplegar el software y ejecutar pruebas sobre su funcionamiento antes de incorporarlo al entorno productivo.",
      },
      subfactores: [
        {
          nombre: "El software es fácil de desplegar y de probar",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: "Fiabilidad",
        tipo_impacto: "Externo",
        importancia_sugerida: 4,
        orden: 4,
        descripcion:
          "Evalúa la estabilidad, confiabilidad, seguridad y robustez operativa del software frente a soluciones alternativas.",
      },
      subfactores: [
        { nombre: "El software es fiable y estable", critico: true },
        {
          nombre:
            "El software tiene un buen historial en cuanto a errores de seguridad (el software es seguro)",
          critico: true,
        },
        {
          nombre: "El software es más flexible que la solución propietaria",
          critico: false,
        },
        {
          nombre: "El software es más confiable que la solución propietaria",
          critico: true,
        },
        {
          nombre:
            "El programa proporciona una amplia variedad de funciones de control de acceso",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: "Reusabilidad",
        tipo_impacto: "Externo",
        importancia_sugerida: 4,
        orden: 5,
        descripcion:
          "Evalúa la capacidad del software para ser reutilizado o extendido dentro de otras soluciones o entornos de desarrollo.",
      },
      subfactores: [
        {
          nombre: "La licencia permite extensiones propietarias",
          critico: false,
        },
        {
          nombre:
            "El software se ofrece como una biblioteca / marco de trabajo",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: "Usabilidad",
        tipo_impacto: "Externo",
        importancia_sugerida: 4,
        orden: 6,
        descripcion:
          "Evalúa la facilidad de uso, aprendizaje e interacción del software desde la perspectiva del usuario final.",
      },
      subfactores: [
        {
          nombre:
            "El software proporciona una interfaz gráfica de usuario (GUI)",
          critico: true,
        },
        {
          nombre:
            "El software es más fácil de usar que la alternativa propietaria",
          critico: false,
        },
        { nombre: "El software es fácil de aprender", critico: true },
        {
          nombre: "El usuario está descontento con el software propietario",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: "Mantenibilidad",
        tipo_impacto: "Interno",
        importancia_sugerida: 4,
        orden: 7,
        descripcion:
          "Evalúa qué tan activamente es mantenido el software y la facilidad para sostener su evolución técnica en el tiempo.",
      },
      subfactores: [
        {
          nombre:
            "El software es mantenido activamente por los desarrolladores",
          critico: true,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: "Portabilidad",
        tipo_impacto: "Externo",
        importancia_sugerida: 4,
        orden: 8,
        descripcion:
          "Evalúa la capacidad del software para funcionar en diferentes dispositivos, entornos o plataformas.",
      },
      subfactores: [
        {
          nombre:
            "Una versión de aplicación móvil de este software está disponible",
          critico: false,
        },
        {
          nombre:
            "El software es una sistemas de administración de base de datos independiente",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: "Documentación",
        tipo_impacto: "Interno",
        importancia_sugerida: 4,
        orden: 9,
        descripcion:
          "Evalúa la calidad, cobertura, disponibilidad y actualización de la documentación técnica y de usuario del software.",
      },
      subfactores: [
        { nombre: "El software está bien documentado", critico: true },
        {
          nombre:
            "La documentación de desarrollo cubre todas las características",
          critico: true,
        },
        {
          nombre: "La documentación está disponible en múltiples formatos",
          critico: false,
        },
        { nombre: "La documentación es fácil de entender", critico: true },
        { nombre: "La documentación está actualizada", critico: true },
        {
          nombre:
            "La documentación está escrita por escritores especializados (no desarrolladores)",
          critico: false,
        },
        {
          nombre: "La documentación del software es de alta calidad",
          critico: true,
        },
        {
          nombre: "El software viene con documentación de desarrollo",
          critico: true,
        },
        {
          nombre: "El software viene con documentación de usuario",
          critico: true,
        },
        {
          nombre:
            "La documentación del usuario cubre todas las características",
          critico: true,
        },
        {
          nombre: "Los formatos de datos están bien documentados",
          critico: true,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: "Formación",
        tipo_impacto: "Interno",
        importancia_sugerida: 4,
        orden: 10,
        descripcion:
          "Evalúa la disponibilidad de capacitación y el potencial del software para fortalecer las habilidades del personal y facilitar el aprendizaje.",
      },
      subfactores: [
        {
          nombre:
            "La adopción de este software permite a los usuarios mejorar las habilidades técnicas de TI",
          critico: false,
        },
        {
          nombre:
            "El personal de la organización puede aprender fácilmente por sí mismo a utilizar este software",
          critico: true,
        },
        {
          nombre:
            "El personal de la organización está capacitado para resolver problemas tecnológicos",
          critico: false,
        },
        {
          nombre:
            "Los planes de entrenamiento de este software están disponibles",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: "Tiempo de adopción",
        tipo_impacto: "Interno",
        importancia_sugerida: 4,
        orden: 11,
        descripcion:
          "Evalúa el esfuerzo y tiempo necesarios para instalar, desplegar y adoptar el software dentro de la organización.",
      },
      subfactores: [
        {
          nombre:
            "Los requisitos de instalación y despliegue del software son fáciles de cumplir",
          critico: false,
        },
        {
          nombre: "El tiempo requerido para adoptar este software es bajo",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: "Casos de estudio de adopción FLOSS",
        tipo_impacto: "Externo",
        importancia_sugerida: 4,
        orden: 12,
        descripcion:
          "Evalúa la existencia de evidencia pública sobre experiencias exitosas de adopción del software en contextos similares.",
      },
      subfactores: [
        {
          nombre:
            "Hay informes públicos disponibles en Internet que describen el éxito de la adopción de este software",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: "Centralidad de la tecnología de la información",
        tipo_impacto: "Interno",
        importancia_sugerida: 4,
        orden: 13,
        descripcion:
          "Evalúa qué tan alineado está el software con la centralización y mejora del entorno de TI de la organización.",
      },
      subfactores: [
        {
          nombre:
            "La adopción de este software mejora el entorno de trabajo de los usuarios",
          critico: false,
        },
        {
          nombre:
            "Centralizar la infraestructura de TI ayuda a acelerar la adopción de este software",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: "Apoyo de la alta dirección",
        tipo_impacto: "Interno",
        importancia_sugerida: 4,
        orden: 14,
        descripcion:
          "Evalúa el nivel de respaldo gerencial necesario para facilitar una adopción exitosa del software.",
      },
      subfactores: [
        {
          nombre:
            "La alta dirección apoya la adopción exitosa de este software",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: "Bloqueo de proveedores",
        tipo_impacto: "Interno",
        importancia_sugerida: 4,
        orden: 15,
        descripcion:
          "Evalúa en qué medida el software reduce la dependencia de proveedores externos y mejora la autonomía tecnológica.",
      },
      subfactores: [
        {
          nombre:
            "El software reduce las dependencias de los proveedores en su entorno",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: "Soporte",
        tipo_impacto: "Interno",
        importancia_sugerida: 4,
        orden: 16,
        descripcion:
          "Evalúa la disponibilidad de soporte comunitario, comercial, técnico y de personal capacitado para mantener el software.",
      },
      subfactores: [
        {
          nombre:
            "El soporte de la comunidad para este software está disponible",
          critico: true,
        },
        {
          nombre:
            "Soporte de expertos y consultores externos para consultas específicas está disponible",
          critico: false,
        },
        {
          nombre:
            "El soporte comercial de este software está disponible 24/7/365",
          critico: false,
        },
        {
          nombre:
            "Hay desarrolladores en su organización que saben cómo desarrollar este software",
          critico: false,
        },
        {
          nombre:
            "Soporte comercial para la personalización de software está disponible",
          critico: false,
        },
        {
          nombre:
            "Es fácil contratar personal informático en la comunidad que conozca este software",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: "Actitud hacia el cambio",
        tipo_impacto: "Interno",
        importancia_sugerida: 4,
        orden: 17,
        descripcion:
          "Evalúa la disposición del personal de la organización para aceptar cambios tecnológicos y respaldar la adopción del software.",
      },
      subfactores: [
        {
          nombre:
            "El personal de la organización muestra poca resistencia al cambio tecnológico",
          critico: false,
        },
        {
          nombre:
            "El personal técnico encargado del despliegue y soporte en la organización respalda la adopción de este software",
          critico: false,
        },
      ],
    },
    {
      factor: {
        dimension_id: dimEco.dimension_id,
        factor_name: "Coste total de propiedad",
        tipo_impacto: "Interno",
        importancia_sugerida: 4,
        orden: 18,
        descripcion:
          "Evalúa el costo total asociado a la adopción, operación y mantenimiento del software, considerando costos ocultos y comparación con alternativas propietarias.",
      },
      subfactores: [
        {
          nombre:
            "Es poco probable que haya costos ocultos al adoptar este software",
          critico: true,
        },
        {
          nombre:
            "La adopción de este software es menos costosa que la alternativa patentada",
          critico: true,
        },
      ],
    },
  ];
  console.log("Insertando factores y subfactores...");
  let totalSubfactores = 0;
  for (const { factor, subfactores } of factoresData) {
    const createdFactor = await prisma.factor.create({ data: factor });
    for (let i = 0; i < subfactores.length; i++) {
      await prisma.subfactor.create({
        data: {
          factor_id: createdFactor.factor_id,
          subfactor_name: subfactores[i].nombre,
          es_critico: subfactores[i].critico,
          orden: i + 1,
        },
      });
      totalSubfactores++;
    }
  }
  console.log(
    `${factoresData.length} factores y ${totalSubfactores} subfactores insertados`,
  );
  console.log("");
  console.log("═══════════════════════════════════════════════");
  console.log("GUIOS PRO v2 — Seed completado exitosamente!");
  console.log("═══════════════════════════════════════════════");
  console.log("   Admin: admin@guios.pro  |  Contraseña: Admin1234!");
  console.log("═══════════════════════════════════════════════");
}
main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
//# sourceMappingURL=seed.js.map
