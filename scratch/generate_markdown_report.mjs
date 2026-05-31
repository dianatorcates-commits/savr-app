import * as fs from 'fs';

const ARTIFACT_PATH = '/Users/EcheverriaTorcates/.gemini/antigravity/brain/b190b489-4789-4917-8401-66e68f142051/banco_ripley_branches_by_day.md';
const SUMMARY_JSON_PATH = 'scratch/ripley_summary_data.json';

const DAYS_ES = {
  'lunes': 'Lunes',
  'martes': 'Martes',
  'miércoles': 'Miércoles',
  'jueves': 'Jueves',
  'viernes': 'Viernes',
  'sábado': 'Sábado',
  'domingo': 'Domingo'
};

const DAYS_ORDER = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function run() {
  try {
    const summaryData = JSON.parse(fs.readFileSync(SUMMARY_JSON_PATH, 'utf-8'));
    
    let md = `# 🏦 Sucursales de Banco Ripley por Día\n\n`;
    md += `Este reporte consolida todas las sucursales y promociones de **Banco Ripley** que se mostrarían en el mapa de SAVR, agrupadas por día de la semana.\n\n`;
    
    // Resumen General
    md += `## 📊 Resumen de Sucursales por Día\n\n`;
    md += `| Día | Cantidad de Sucursales | Marcas / Restaurantes Activos |\n`;
    md += `| :--- | :---: | :--- |\n`;
    
    let totalUniqueBranches = new Set();
    
    DAYS_ORDER.forEach(day => {
      const data = summaryData[day] || [];
      const branchCount = data.reduce((sum, r) => sum + r.sucursales.length, 0);
      const brandsList = data.map(r => `**${r.restaurant}** (${r.sucursales.length})`).join(', ');
      md += `| ${DAYS_ES[day]} | **${branchCount}** | ${brandsList} |\n`;
      
      data.forEach(r => {
        r.sucursales.forEach(s => {
          totalUniqueBranches.add(s.direccion); // Usar dirección como aproximación de unicidad
        });
      });
    });
    
    md += `\n> [!NOTE]\n`;
    md += `> Hay un total de **${totalUniqueBranches.size} sucursales físicas únicas** que tienen convenios activos con Banco Ripley a lo largo de la semana.\n\n`;

    // Detalle por día
    md += `## 📅 Detalle de Sucursales por Día\n\n`;
    
    DAYS_ORDER.forEach(day => {
      const data = summaryData[day] || [];
      const branchCount = data.reduce((sum, r) => sum + r.sucursales.length, 0);
      
      md += `### 📅 ${DAYS_ES[day]} (${branchCount} sucursales)\n\n`;
      
      if (data.length === 0) {
        md += `*No hay sucursales disponibles para este día.*\n\n`;
        return;
      }
      
      data.forEach(r => {
        md += `#### 🍔 ${r.restaurant} (${r.beneficio} dcto. - *${r.dias_validos}*)\n`;
        md += `> ${r.descripcion}\n\n`;
        
        md += `| Sucursal | Dirección | Comuna |\n`;
        md += `| :--- | :--- | :--- |\n`;
        
        // Ordenar sucursales por comuna/nombre
        const sortedSucursales = [...r.sucursales].sort((a, b) => {
          const compComuna = (a.comuna || '').localeCompare(b.comuna || '');
          if (compComuna !== 0) return compComuna;
          return a.nombre.localeCompare(b.nombre);
        });
        
        sortedSucursales.forEach(s => {
          md += `| ${s.nombre} | ${s.direccion} | ${s.comuna || 'N/A'} |\n`;
        });
        md += `\n`;
      });
      
      md += `---\n\n`;
    });
    
    fs.writeFileSync(ARTIFACT_PATH, md, 'utf-8');
    console.log(`Reporte markdown escrito exitosamente en: ${ARTIFACT_PATH}`);
  } catch (error) {
    console.error("Error al generar reporte markdown:", error);
  }
}

run();
