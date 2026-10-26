const { isCostaRicaHoliday } = require('../src/utils/holidays');

describe('Feriados de Costa Rica', () => {
  test.each([
    ['2026-09-15T18:00:00Z', true],  // Independencia
    ['2026-04-02T18:00:00Z', true],  // Jueves Santo 2026
    ['2026-04-03T18:00:00Z', true],  // Viernes Santo 2026
    ['2026-04-04T18:00:00Z', false], // Sábado Santo no es feriado de ley
    ['2026-10-25T18:00:00Z', false],
  ])('%s → %s', (iso, expected) => {
    expect(isCostaRicaHoliday(new Date(iso))).toBe(expected);
  });

  test('usa la hora de Costa Rica, no la del servidor', () => {
    // 16 de setiembre 03:00 UTC = 15 de setiembre 21:00 en Costa Rica (feriado)
    expect(isCostaRicaHoliday(new Date('2026-09-16T03:00:00Z'))).toBe(true);
  });
});
