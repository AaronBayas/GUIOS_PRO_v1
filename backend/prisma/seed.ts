import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed de GUIOS PRO v2...')

  // ── ROLES ──────────────────────────────────────────────────────
  const rolAdmin = await prisma.rol.upsert({
    where: { rol_name: 'Administrador' },
    update: {},
    create: { rol_name: 'Administrador' },
  })
  const rolEvaluador = await prisma.rol.upsert({
    where: { rol_name: 'Evaluador' },
    update: {},
    create: { rol_name: 'Evaluador' },
  })
  console.log('Roles creados')

  // ── USUARIO ADMIN POR DEFECTO ───────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin1234!', 12)
  await prisma.usuario.upsert({
    where: { email: 'admin@guios.pro' },
    update: {},
    create: {
      rol_id: rolAdmin.rol_id,
      usuario_name: 'Administrador GUIOS',
      email: 'admin@guios.pro',
      password_hash: passwordHash,
      activo: true,
    },
  })
  console.log('Usuario admin creado: admin@guios.pro / Admin1234!')

  // ── DIMENSIONES ─────────────────────────────────────────────────
  const dimTec = await prisma.dimension.upsert({
    where: { dimension_name: 'Tecnológica' },
    update: {},
    create: { dimension_name: 'Tecnológica', orden: 1 },
  })
  const dimOrg = await prisma.dimension.upsert({
    where: { dimension_name: 'Organizacional' },
    update: {},
    create: { dimension_name: 'Organizacional', orden: 2 },
  })
  const dimEco = await prisma.dimension.upsert({
    where: { dimension_name: 'Económica' },
    update: {},
    create: { dimension_name: 'Económica', orden: 3 },
  })
  console.log('Dimensiones creadas')

  // ── FACTORES Y SUBFACTORES ──────────────────────────────────────
  // Formato: { factor, subfactores: [{ nombre, critico }] }
  const factoresData = [
    // ── DIMENSIÓN TECNOLÓGICA ──────────────────────────────────────
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: 'Seguridad y Cumplimiento Normativo',
        tipo_impacto: 'Externo',
        importancia_sugerida: 4,
        orden: 1,
        descripcion: 'Evalúa las capacidades de seguridad del software, incluyendo cifrado, autenticación, control de acceso y cumplimiento de normativas internacionales (GDPR, ISO 27001, SOC2). Investigaciones 2022-2026 destacan la criticidad de la seguridad en FLOSS ante el incremento de ataques a cadenas de suministro de software.',
      },
      subfactores: [
        { nombre: 'Soporte de cifrado de datos en tránsito y en reposo (TLS 1.3+, AES-256)', critico: true },
        { nombre: 'Autenticación multifactor (MFA) y gestión robusta de sesiones', critico: true },
        { nombre: 'Control de acceso basado en roles (RBAC) o atributos (ABAC)', critico: true },
        { nombre: 'Historial de vulnerabilidades (CVE) y tiempo medio de parcheo (<30 días)', critico: true },
        { nombre: 'Cumplimiento con GDPR, ISO 27001, SOC2 u otras normativas aplicables', critico: true },
        { nombre: 'Análisis de composición de software (SCA) y gestión de dependencias seguras', critico: false },
        { nombre: 'Auditorías de seguridad independientes publicadas en los últimos 3 años', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: 'Compatibilidad e Interoperabilidad',
        tipo_impacto: 'Externo',
        importancia_sugerida: 3,
        orden: 2,
        descripcion: 'Mide la capacidad del software para integrarse con otros sistemas, plataformas y estándares existentes en la organización. Incluye soporte de APIs REST/GraphQL, formatos de datos estándar y protocolos de interoperabilidad.',
      },
      subfactores: [
        { nombre: 'APIs REST/GraphQL bien documentadas y versionadas', critico: true },
        { nombre: 'Soporte de formatos de datos estándar (JSON, XML, CSV, Parquet)', critico: true },
        { nombre: 'Compatibilidad con sistemas operativos objetivo (Linux, Windows, macOS)', critico: false },
        { nombre: 'Integración nativa o por plugins con herramientas del ecosistema empresarial', critico: false },
        { nombre: 'Soporte de protocolos de autenticación estándar (OAuth2, SAML, LDAP)', critico: false },
        { nombre: 'Capacidad de exportación e importación de datos en formatos abiertos', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: 'Rendimiento y Escalabilidad',
        tipo_impacto: 'Externo',
        importancia_sugerida: 3,
        orden: 3,
        descripcion: 'Evalúa el comportamiento del software bajo carga, su capacidad de escalar horizontal o verticalmente y el uso eficiente de recursos computacionales. Las métricas de rendimiento son críticas para entornos de producción.',
      },
      subfactores: [
        { nombre: 'Benchmarks documentados de rendimiento bajo carga representativa', critico: true },
        { nombre: 'Soporte de escalado horizontal (clustering) y/o vertical', critico: true },
        { nombre: 'Arquitectura optimizada para entornos cloud (cloud-native)', critico: true },
        { nombre: 'Métricas de latencia y throughput disponibles públicamente', critico: false },
        { nombre: 'Soporte de caché, índices y optimización de consultas', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: 'Fiabilidad y Estabilidad',
        tipo_impacto: 'Externo',
        importancia_sugerida: 3,
        orden: 4,
        descripcion: 'Analiza la madurez del software en términos de uptime, manejo de errores, recuperación ante fallos y predictibilidad de su comportamiento. Una alta fiabilidad reduce el riesgo operacional.',
      },
      subfactores: [
        { nombre: 'SLA o uptime documentado superior al 99.5% en producciones de referencia', critico: true },
        { nombre: 'Mecanismos de recuperación ante fallos (failover, backups automáticos)', critico: true },
        { nombre: 'Pruebas automatizadas con cobertura superior al 70% del código', critico: true },
        { nombre: 'Registro de incidentes críticos y tiempo de resolución documentado', critico: false },
        { nombre: 'Compatibilidad con herramientas de monitorización estándar (Prometheus, Grafana)', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: 'Usabilidad y Experiencia de Usuario',
        tipo_impacto: 'Externo',
        importancia_sugerida: 3,
        orden: 5,
        descripcion: 'Evalúa la facilidad de uso, accesibilidad y calidad de la experiencia del usuario final. Un software con buena UX reduce los costes de formación y aumenta la adopción organizacional.',
      },
      subfactores: [
        { nombre: 'Interfaz intuitiva con curva de aprendizaje documentada (<2 semanas para usuario promedio)', critico: true },
        { nombre: 'Cumplimiento de accesibilidad WCAG 2.1 nivel AA o superior', critico: true },
        { nombre: 'Disponibilidad en el idioma principal de la organización', critico: false },
        { nombre: 'Soporte de temas, personalización de interfaz y modo oscuro', critico: false },
        { nombre: 'Versión móvil o aplicación responsiva disponible', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: 'Mantenibilidad y Calidad del Código',
        tipo_impacto: 'Externo',
        importancia_sugerida: 3,
        orden: 6,
        descripcion: 'Mide la calidad interna del código, la facilidad para realizar modificaciones y la existencia de prácticas de desarrollo maduras. Una alta mantenibilidad garantiza la evolución sostenible del software.',
      },
      subfactores: [
        { nombre: 'Análisis de calidad de código disponible (SonarQube, CodeClimate) con puntuación A o B', critico: true },
        { nombre: 'Deuda técnica documentada y gestionada activamente', critico: true },
        { nombre: 'Arquitectura modular con separación clara de responsabilidades', critico: true },
        { nombre: 'Pipeline CI/CD público y funcional (GitHub Actions, GitLab CI)', critico: false },
        { nombre: 'Uso de estándares de codificación y linting automatizado', critico: false },
        { nombre: 'Changelog detallado y commits semánticos (Conventional Commits)', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: 'Portabilidad y Despliegue Moderno',
        tipo_impacto: 'Externo',
        importancia_sugerida: 2,
        orden: 7,
        descripcion: 'Evalúa la facilidad de despliegue en distintos entornos, soporte de contenedores y compatibilidad con infraestructuras modernas (Kubernetes, serverless, edge computing).',
      },
      subfactores: [
        { nombre: 'Imágenes Docker oficiales y actualizadas en registry público', critico: true },
        { nombre: 'Helm charts o manifiestos Kubernetes disponibles y mantenidos', critico: false },
        { nombre: 'Soporte de configuración por variables de entorno (12-Factor App)', critico: false },
        { nombre: 'Tiempo de despliegue inicial documentado (<1 hora para entorno dev)', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: 'Documentación Técnica',
        tipo_impacto: 'Externo',
        importancia_sugerida: 2,
        orden: 8,
        descripcion: 'Evalúa la calidad, completitud y actualización de la documentación técnica, incluyendo guías de instalación, referencia de API, tutoriales y documentación arquitectónica.',
      },
      subfactores: [
        { nombre: 'Documentación oficial actualizada a la versión evaluada', critico: true },
        { nombre: 'Guía de inicio rápido (quickstart) funcional y verificable', critico: true },
        { nombre: 'Referencia de API completa (OpenAPI/Swagger o equivalente)', critico: true },
        { nombre: 'Guía de arquitectura y decisiones de diseño (ADR)', critico: false },
        { nombre: 'Ejemplos de código y tutoriales para casos de uso comunes', critico: false },
        { nombre: 'Documentación disponible en al menos inglés y preferiblemente en español', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimTec.dimension_id,
        factor_name: 'Integración con Ecosistemas e IA',
        tipo_impacto: 'Externo',
        importancia_sugerida: 2,
        orden: 9,
        descripcion: 'Evalúa la capacidad del software de integrarse con plataformas modernas de IA/ML, herramientas de análisis de datos y ecosistemas de productividad empresarial (Microsoft 365, Google Workspace, etc.).',
      },
      subfactores: [
        { nombre: 'Integración documentada con plataformas IA/ML (OpenAI, HuggingFace, LangChain)', critico: false },
        { nombre: 'Conectores nativos para ecosistemas empresariales (M365, GSuite, Salesforce)', critico: false },
        { nombre: 'Webhook y eventos para integración event-driven', critico: false },
        { nombre: 'SDK disponible en al menos 2 lenguajes de programación principales', critico: false },
      ],
    },

    // ── DIMENSIÓN ORGANIZACIONAL ───────────────────────────────────
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: 'Salud y Actividad de la Comunidad',
        tipo_impacto: 'Externo',
        importancia_sugerida: 3,
        orden: 10,
        descripcion: 'Analiza la vitalidad del ecosistema de la comunidad: frecuencia de releases, número de contribuidores activos, respuesta a issues y sostenibilidad del proyecto a largo plazo.',
      },
      subfactores: [
        { nombre: 'Al menos 1 release estable en los últimos 6 meses', critico: true },
        { nombre: 'Más de 10 contribuidores activos en los últimos 12 meses', critico: true },
        { nombre: 'Tiempo medio de respuesta a issues menor a 7 días', critico: true },
        { nombre: 'Foro activo, canal Slack/Discord o lista de correo con actividad reciente', critico: false },
        { nombre: 'Respaldo de fundación o empresa con modelo de sostenibilidad documentado', critico: false },
        { nombre: 'Roadmap público y transparente con compromisos de versiones futuras', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: 'Formación y Gestión del Cambio',
        tipo_impacto: 'Interno',
        importancia_sugerida: 3,
        orden: 11,
        descripcion: 'Evalúa la disponibilidad de recursos formativos y la facilidad de gestionar la transición organizacional hacia el nuevo software. Incluye cursos oficiales, certificaciones y materiales de capacitación.',
      },
      subfactores: [
        { nombre: 'Cursos oficiales o certificaciones reconocidas disponibles', critico: true },
        { nombre: 'Material de formación gratuito (videos, tutoriales, MOOCs) de calidad verificable', critico: true },
        { nombre: 'Guía de migración documentada desde soluciones propietarias comunes', critico: true },
        { nombre: 'Comunidad de práctica o grupos de usuarios locales/regionales activos', critico: true },
        { nombre: 'Tiempo estimado de formación para usuarios promedio documentado', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: 'Soporte y Servicios Profesionales',
        tipo_impacto: 'Ambos',
        importancia_sugerida: 3,
        orden: 12,
        descripcion: 'Analiza la disponibilidad de soporte técnico profesional, empresas consultoras especializadas y servicios gestionados (SaaS/hosted). Fundamental para garantizar la continuidad operacional.',
      },
      subfactores: [
        { nombre: 'Al menos 3 empresas certificadas que ofrezcan soporte comercial documentado', critico: true },
        { nombre: 'Opción SaaS/hosted gestionada disponible como alternativa al auto-hospedaje', critico: true },
        { nombre: 'SLA de soporte comercial disponible (respuesta <4h para incidentes críticos)', critico: false },
        { nombre: 'Presencia de empresas de soporte en la región geográfica objetivo', critico: false },
        { nombre: 'Comunidad activa que resuelve dudas técnicas (Stack Overflow, GitHub Issues)', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: 'Soberanía Digital y Reducción de Dependencia',
        tipo_impacto: 'Ambos',
        importancia_sugerida: 3,
        orden: 13,
        descripcion: 'Evalúa la capacidad del software para reducir la dependencia de proveedores propietarios (vendor lock-in), garantizar el control de datos y promover la autonomía tecnológica de la organización.',
      },
      subfactores: [
        { nombre: 'Datos completamente exportables en formatos abiertos y estándar', critico: true },
        { nombre: 'Sin cláusulas de lock-in técnico o contractual en la licencia', critico: true },
        { nombre: 'Posibilidad de auto-hospedaje completo sin dependencia de servicios externos', critico: true },
        { nombre: 'Código fuente auditable y sin ofuscación', critico: true },
        { nombre: 'Presencia en catálogos de software soberano o recomendado por gobiernos', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: 'Adopción Documentada y Casos de Estudio',
        tipo_impacto: 'Externo',
        importancia_sugerida: 2,
        orden: 14,
        descripcion: 'Verifica si existen casos de uso reales documentados en organizaciones de tamaño y sector similares, lo que reduce el riesgo de adopción.',
      },
      subfactores: [
        { nombre: 'Al menos 3 casos de estudio públicos de organizaciones del mismo sector', critico: true },
        { nombre: 'Referencias verificables de implementaciones exitosas en producción', critico: false },
        { nombre: 'Presencia en comparativas y análisis de analistas (Gartner, Forrester, G2)', critico: false },
        { nombre: 'Testimonios o reseñas verificables de usuarios reales', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: 'Gobernanza, Licenciamiento y Cumplimiento Legal',
        tipo_impacto: 'Externo',
        importancia_sugerida: 3,
        orden: 15,
        descripcion: 'Evalúa el modelo de gobernanza del proyecto, la compatibilidad de la licencia con el uso organizacional y el cumplimiento de requisitos legales específicos del sector.',
      },
      subfactores: [
        { nombre: 'Licencia OSI-aprobada compatible con el uso comercial organizacional', critico: true },
        { nombre: 'CLA (Contributor License Agreement) o DCO documentado y transparente', critico: true },
        { nombre: 'Modelo de gobernanza del proyecto documentado (fundación, empresa, comité)', critico: true },
        { nombre: 'Sin dependencias con licencias incompatibles (GPL contamination, etc.)', critico: false },
        { nombre: 'Cumplimiento verificado con regulaciones del sector (HIPAA, PCI-DSS, etc.) si aplica', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimOrg.dimension_id,
        factor_name: 'Madurez y Tiempo de Adopción',
        tipo_impacto: 'Interno',
        importancia_sugerida: 2,
        orden: 16,
        descripcion: 'Analiza la madurez del software en función de su antigüedad, estabilidad de versiones y la experiencia acumulada del mercado en su uso.',
      },
      subfactores: [
        { nombre: 'Proyecto con más de 5 años de historia o equivalente en madurez de versión', critico: true },
        { nombre: 'Versión estable (no beta) disponible con soporte LTS si aplica', critico: true },
        { nombre: 'Proceso de deprecación y migración documentado para versiones anteriores', critico: false },
        { nombre: 'Historial de versiones públicamente disponible con notas de cambio detalladas', critico: false },
      ],
    },

    // ── DIMENSIÓN ECONÓMICA ────────────────────────────────────────
    {
      factor: {
        dimension_id: dimEco.dimension_id,
        factor_name: 'Coste Total de Propiedad (TCO)',
        tipo_impacto: 'Interno',
        importancia_sugerida: 4,
        orden: 17,
        descripcion: 'Calcula el coste total de adoptar y mantener el software considerando instalación, formación, soporte, infraestructura, personalización y costes ocultos. Es el factor económico más crítico.',
      },
      subfactores: [
        { nombre: 'Coste de infraestructura estimado documentado para la escala objetivo', critico: true },
        { nombre: 'Coste de formación y certificación del equipo técnico estimable', critico: true },
        { nombre: 'Coste de soporte comercial (si requerido) transparente y competitivo', critico: true },
        { nombre: 'Comparativa TCO vs solución propietaria equivalente disponible', critico: false },
        { nombre: 'Ausencia de costes ocultos por funcionalidades premium o módulos de pago', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimEco.dimension_id,
        factor_name: 'Retorno de Inversión y Valor Estratégico',
        tipo_impacto: 'Interno',
        importancia_sugerida: 3,
        orden: 18,
        descripcion: 'Evalúa el potencial de retorno de inversión (ROI) del software: ahorro de costos de licencias, mejora de productividad, valor estratégico de la independencia tecnológica.',
      },
      subfactores: [
        { nombre: 'Ahorro estimado en licencias vs solución propietaria equivalente > 30%', critico: true },
        { nombre: 'Mejora documentada de productividad en casos de uso similares', critico: true },
        { nombre: 'Alineación con objetivos estratégicos de soberanía digital de la organización', critico: true },
        { nombre: 'Posibilidad de personalización que genera ventaja competitiva', critico: false },
      ],
    },
    {
      factor: {
        dimension_id: dimEco.dimension_id,
        factor_name: 'Gestión de Riesgos y Continuidad',
        tipo_impacto: 'Interno',
        importancia_sugerida: 3,
        orden: 19,
        descripcion: 'Evalúa los mecanismos para gestionar los riesgos asociados a la adopción del software, incluyendo planes de contingencia, opciones de salida y garantías de continuidad del servicio.',
      },
      subfactores: [
        { nombre: 'Plan de contingencia documentado si el proyecto FLOSS es descontinuado', critico: true },
        { nombre: 'Opción de fork viable con recursos técnicos razonables', critico: true },
        { nombre: 'Datos y configuraciones exportables para migración a alternativas', critico: true },
        { nombre: 'Seguro o garantía contractual disponible con proveedor de soporte', critico: false },
      ],
    },
  ]

  console.log('Insertando factores y subfactores...')
  let totalSubfactores = 0

  for (const { factor, subfactores } of factoresData) {
    const createdFactor = await prisma.factor.create({ data: factor })
    for (let i = 0; i < subfactores.length; i++) {
      await prisma.subfactor.create({
        data: {
          factor_id: createdFactor.factor_id,
          subfactor_name: subfactores[i].nombre,
          es_critico: subfactores[i].critico,
          orden: i + 1,
        },
      })
      totalSubfactores++
    }
  }

  console.log(`${factoresData.length} factores y ${totalSubfactores} subfactores insertados`)
  console.log('')
  console.log('═══════════════════════════════════════════════')
  console.log('GUIOS PRO v2 — Seed completado exitosamente!')
  console.log('═══════════════════════════════════════════════')
  console.log('   Admin: admin@guios.pro  |  Contraseña: Admin1234!')
  console.log('═══════════════════════════════════════════════')
}

main()
  .catch((e) => {
    console.error('Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
