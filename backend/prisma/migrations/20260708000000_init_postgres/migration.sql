-- CreateTable
CREATE TABLE "rol" (
    "rol_id" SERIAL NOT NULL,
    "rol_name" TEXT NOT NULL,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("rol_id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "usuario_id" SERIAL NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "usuario_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "dimension" (
    "dimension_id" SERIAL NOT NULL,
    "dimension_name" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dimension_pkey" PRIMARY KEY ("dimension_id")
);

-- CreateTable
CREATE TABLE "factor" (
    "factor_id" SERIAL NOT NULL,
    "dimension_id" INTEGER NOT NULL,
    "factor_name" TEXT NOT NULL,
    "tipo_impacto" TEXT NOT NULL DEFAULT 'Externo',
    "importancia_sugerida" INTEGER NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "version_actual" INTEGER NOT NULL DEFAULT 1,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factor_pkey" PRIMARY KEY ("factor_id")
);

-- CreateTable
CREATE TABLE "subfactor" (
    "subfactor_id" SERIAL NOT NULL,
    "factor_id" INTEGER NOT NULL,
    "subfactor_name" TEXT NOT NULL,
    "es_critico" BOOLEAN NOT NULL DEFAULT false,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subfactor_pkey" PRIMARY KEY ("subfactor_id")
);

-- CreateTable
CREATE TABLE "evaluacion" (
    "evaluacion_id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "software_nombre" TEXT NOT NULL,
    "software_version" TEXT,
    "software_tipo" TEXT NOT NULL DEFAULT 'Otro',
    "software_sitio_web" TEXT,
    "software_licencia" TEXT,
    "software_descripcion" TEXT,
    "organizacion_nombre" TEXT,
    "organizacion_sector" TEXT,
    "evaluador_nombre" TEXT,
    "contexto_evaluacion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Borrador',
    "paso_actual" INTEGER NOT NULL DEFAULT 1,
    "recomendacion" TEXT,
    "risk_score" DOUBLE PRECISION,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_limite" TIMESTAMP(3),
    "ultimo_guardado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluacion_pkey" PRIMARY KEY ("evaluacion_id")
);

-- CreateTable
CREATE TABLE "evaluacion_factor" (
    "efactor_id" SERIAL NOT NULL,
    "evaluacion_id" INTEGER NOT NULL,
    "factor_id" INTEGER NOT NULL,
    "importancia_decisor" INTEGER,
    "importancia_relativa" TEXT,
    "ponderacion_media" DOUBLE PRECISION,
    "clasificacion_foda" TEXT,
    "foda_interno" TEXT,
    "foda_externo" TEXT,
    "alcance_override" TEXT,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluacion_factor_pkey" PRIMARY KEY ("efactor_id")
);

-- CreateTable
CREATE TABLE "evaluacion_subfactor" (
    "esubfactor_id" SERIAL NOT NULL,
    "efactor_id" INTEGER NOT NULL,
    "subfactor_id" INTEGER NOT NULL,
    "peso" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluacion_subfactor_pkey" PRIMARY KEY ("esubfactor_id")
);

-- CreateTable
CREATE TABLE "evaluacion_colaborador" (
    "colaborador_id" SERIAL NOT NULL,
    "evaluacion_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "aceptado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_invitacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_aceptacion" TIMESTAMP(3),

    CONSTRAINT "evaluacion_colaborador_pkey" PRIMARY KEY ("colaborador_id")
);

-- CreateTable
CREATE TABLE "factor_version" (
    "version_id" SERIAL NOT NULL,
    "factor_id" INTEGER NOT NULL,
    "numero_version" INTEGER NOT NULL,
    "snapshot_json" TEXT NOT NULL,
    "motivo_cambio" TEXT,
    "creado_por" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "factor_version_pkey" PRIMARY KEY ("version_id")
);

-- CreateTable
CREATE TABLE "ai_recomendacion" (
    "ai_rec_id" SERIAL NOT NULL,
    "evaluacion_id" INTEGER NOT NULL,
    "modelo_usado" TEXT NOT NULL,
    "prompt_usado" TEXT,
    "respuesta_texto" TEXT NOT NULL,
    "tokens_usados" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'completado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_recomendacion_pkey" PRIMARY KEY ("ai_rec_id")
);

-- CreateTable
CREATE TABLE "historial_cambio" (
    "historial_id" SERIAL NOT NULL,
    "evaluacion_id" INTEGER NOT NULL,
    "tipo_cambio" TEXT NOT NULL,
    "descripcion" TEXT,
    "snapshot_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_cambio_pkey" PRIMARY KEY ("historial_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rol_rol_name_key" ON "rol"("rol_name");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "dimension_dimension_name_key" ON "dimension"("dimension_name");

-- CreateIndex
CREATE UNIQUE INDEX "evaluacion_factor_evaluacion_id_factor_id_key" ON "evaluacion_factor"("evaluacion_id", "factor_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluacion_subfactor_efactor_id_subfactor_id_key" ON "evaluacion_subfactor"("efactor_id", "subfactor_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluacion_colaborador_evaluacion_id_usuario_id_key" ON "evaluacion_colaborador"("evaluacion_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "factor_version_factor_id_numero_version_key" ON "factor_version"("factor_id", "numero_version");

-- CreateIndex
CREATE UNIQUE INDEX "ai_recomendacion_evaluacion_id_key" ON "ai_recomendacion"("evaluacion_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("rol_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factor" ADD CONSTRAINT "factor_dimension_id_fkey" FOREIGN KEY ("dimension_id") REFERENCES "dimension"("dimension_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subfactor" ADD CONSTRAINT "subfactor_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "factor"("factor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_factor" ADD CONSTRAINT "evaluacion_factor_evaluacion_id_fkey" FOREIGN KEY ("evaluacion_id") REFERENCES "evaluacion"("evaluacion_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_factor" ADD CONSTRAINT "evaluacion_factor_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "factor"("factor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_subfactor" ADD CONSTRAINT "evaluacion_subfactor_efactor_id_fkey" FOREIGN KEY ("efactor_id") REFERENCES "evaluacion_factor"("efactor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_subfactor" ADD CONSTRAINT "evaluacion_subfactor_subfactor_id_fkey" FOREIGN KEY ("subfactor_id") REFERENCES "subfactor"("subfactor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_colaborador" ADD CONSTRAINT "evaluacion_colaborador_evaluacion_id_fkey" FOREIGN KEY ("evaluacion_id") REFERENCES "evaluacion"("evaluacion_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_colaborador" ADD CONSTRAINT "evaluacion_colaborador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factor_version" ADD CONSTRAINT "factor_version_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "factor"("factor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factor_version" ADD CONSTRAINT "factor_version_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recomendacion" ADD CONSTRAINT "ai_recomendacion_evaluacion_id_fkey" FOREIGN KEY ("evaluacion_id") REFERENCES "evaluacion"("evaluacion_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_cambio" ADD CONSTRAINT "historial_cambio_evaluacion_id_fkey" FOREIGN KEY ("evaluacion_id") REFERENCES "evaluacion"("evaluacion_id") ON DELETE CASCADE ON UPDATE CASCADE;