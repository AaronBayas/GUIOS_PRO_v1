export declare const LEVELS: readonly ["Irrelevante", "Opcional", "Importante", "Fundamental"];
export type NivelImportancia = typeof LEVELS[number];
export declare function calcularIR(is: number, id: number): NivelImportancia;
export declare function esRelevante(irLabel: NivelImportancia): boolean;
export interface SubfactorInput {
    peso: number;
    es_critico: boolean;
}
export declare function calcularPM(subfactores: SubfactorInput[]): number;
export declare function getUmbral(dimensionName: string): number;
export type ClasifFoda = 'Fortaleza' | 'Oportunidad' | 'Debilidad' | 'Amenaza';
export declare function clasificarFoda(pm: number, alcance: 'Interno' | 'Externo', umbral: number): ClasifFoda;
export declare function clasificarFodaAmbos(pm: number, umbral: number): {
    interno: ClasifFoda;
    externo: ClasifFoda;
    final: ClasifFoda;
};
export interface FactorResultado {
    ir: string;
    foda: ClasifFoda;
}
export declare function calcularRiskScore(factores: FactorResultado[]): number;
export declare function calcularRecomendacion(riskScore: number): 'A' | 'B' | 'C';
export declare function getDescripcionRecomendacion(rec: 'A' | 'B' | 'C', softwareNombre: string): string;
//# sourceMappingURL=guiosad.engine.d.ts.map