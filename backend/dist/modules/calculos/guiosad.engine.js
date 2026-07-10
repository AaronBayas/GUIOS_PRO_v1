"use strict";
// Motor de cálculo GUIOSAD v2
// Implementa las diferencias respecto a la tesis original (Sánchez, 2022)
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEVELS = void 0;
exports.calcularIR = calcularIR;
exports.esRelevante = esRelevante;
exports.calcularPM = calcularPM;
exports.getUmbral = getUmbral;
exports.clasificarFoda = clasificarFoda;
exports.clasificarFodaAmbos = clasificarFodaAmbos;
exports.calcularRiskScore = calcularRiskScore;
exports.calcularRecomendacion = calcularRecomendacion;
exports.getDescripcionRecomendacion = getDescripcionRecomendacion;
// ── NIVELES DE IMPORTANCIA ───────────────────────────────────
exports.LEVELS = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental'];
// ── CÁLCULO IR: IMPORTANCIA RELATIVA ────────────────────────
// Peso 60% IS (científica) / 40% ID (decisor) — diferencia respecto a tesis (50/50)
function calcularIR(is, id) {
    const isIdx = is - 1; // convierte 1-4 a índice 0-3
    const idIdx = id - 1;
    const irScore = (isIdx * 0.60) + (idIdx * 0.40);
    const irIdx = Math.round(irScore);
    return exports.LEVELS[Math.min(irIdx, 3)];
}
function esRelevante(irLabel) {
    return exports.LEVELS.indexOf(irLabel) >= 1; // >= Opcional
}
function calcularPM(subfactores) {
    if (!subfactores.length)
        return 0;
    const sumPesos = subfactores.reduce((acc, s) => acc + s.peso * (s.es_critico ? 1.5 : 1.0), 0);
    const sumCoeffs = subfactores.reduce((acc, s) => acc + (s.es_critico ? 1.5 : 1.0), 0);
    return parseFloat((sumPesos / sumCoeffs).toFixed(2));
}
// ── UMBRALES FODA DIFERENCIADOS POR DIMENSIÓN ───────────────
// Diferencia respecto a tesis: umbrales fijos → diferenciados por dimensión
const UMBRALES = {
    'Tecnológica': 2.8,
    'Organizacional': 3.0,
    'Económica': 3.2,
};
function getUmbral(dimensionName) {
    return UMBRALES[dimensionName] ?? 3.0;
}
function clasificarFoda(pm, alcance, umbral) {
    if (alcance === 'Interno')
        return pm >= umbral ? 'Fortaleza' : 'Debilidad';
    return pm >= umbral ? 'Oportunidad' : 'Amenaza';
}
// Factores tipo "Ambos": genera dos clasificaciones, retorna la más desfavorable
function clasificarFodaAmbos(pm, umbral) {
    const interno = clasificarFoda(pm, 'Interno', umbral);
    const externo = clasificarFoda(pm, 'Externo', umbral);
    const ranking = ['Fortaleza', 'Oportunidad', 'Debilidad', 'Amenaza'];
    const final = ranking.indexOf(interno) > ranking.indexOf(externo) ? interno : externo;
    return { interno, externo, final };
}
// ── RISK SCORE Y RECOMENDACIÓN FINAL ────────────────────────
const IR_PESO = {
    Opcional: 1,
    Importante: 2,
    Fundamental: 3
};
const FODA_PENALIDAD = {
    Fortaleza: 0,
    Oportunidad: 0,
    Debilidad: 1,
    Amenaza: 2
};
function calcularRiskScore(factores) {
    return factores.reduce((acc, f) => {
        return acc + ((IR_PESO[f.ir] ?? 0) * (FODA_PENALIDAD[f.foda] ?? 0));
    }, 0);
}
function calcularRecomendacion(riskScore) {
    if (riskScore === 0)
        return 'A';
    if (riskScore >= 1 && riskScore <= 4)
        return 'B';
    return 'C';
}
// ── DESCRIPCIÓN DE RECOMENDACIÓN ────────────────────────────
function getDescripcionRecomendacion(rec, softwareNombre) {
    const descripciones = {
        A: `${softwareNombre} presenta un perfil FODA favorable para su adopción. No se detectaron debilidades o amenazas significativas en factores críticos. Se recomienda proceder con la adopción, elaborando un plan de implementación por fases que capitalice las fortalezas identificadas.`,
        B: `${softwareNombre} presenta condiciones aceptables para su adopción con reservas. Se detectaron algunas debilidades o amenazas en factores de importancia moderada que deben gestionarse. Se recomienda elaborar un plan de mitigación de riesgos antes de proceder, estableciendo hitos de revisión durante la implementación.`,
        C: `${softwareNombre} presenta riesgos significativos que desaconsejan su adopción inmediata. Se detectaron debilidades o amenazas importantes en factores críticos. Se recomienda no adoptar en este momento, reevaluar en 6-12 meses cuando el software haya madurado, o explorar alternativas con mejor perfil de riesgo.`,
    };
    return descripciones[rec];
}
//# sourceMappingURL=guiosad.engine.js.map