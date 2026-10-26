class Combo {
  static calculatePrice(comboNumber) {
    if (comboNumber < 1 || comboNumber > 9)
      throw new Error('combo_number must be between 1 and 9');
    return (comboNumber + 3) * 1000;
  }
}

module.exports = Combo;
