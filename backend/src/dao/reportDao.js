// Indicadores del panel de administración.
const db = require('../config/db');

module.exports = {
  async overview(today, from) {
    const [[kpis], daily, hourly, topRestaurants, [split], paymentMethods] =
      await db.callSets('sp_report_overview', [today, from]);
    return { kpis, daily, hourly, topRestaurants, split, paymentMethods };
  },
};
