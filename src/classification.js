export const ruleKey=description=>description.replace(/\(\s*\d+\/\d+\s*\)/g,'').trim().toUpperCase();
export function suggestCategory(description) {
  const text=ruleKey(description).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const rules=[[/SUPERMERC|\bMERCADO\b|\bHORTIFRUTI\b/,'Supermercado'],[/RESTAUR|LANCH|PADARIA|IFOOD|UBER\s*EATS/,'Alimentação'],[/\bUBER\b|\b99\b|TAXI|COMBUST|POSTO/,'Transporte'],[/SPOTIFY|NETFLIX|STREAMING/,'Assinaturas'],[/HOTEL|BOOKING|AIRBNB|PASSAGEM/,'Viagens']];
  return rules.find(([pattern])=>pattern.test(text))?.[1]||'Não classificado';
}
