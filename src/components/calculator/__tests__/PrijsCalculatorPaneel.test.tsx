import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import PrijsCalculatorPaneel from '@/components/calculator/PrijsCalculatorPaneel';

// Een ouder dossier heeft wel bedragen maar geen bewaarde calculator-instellingen.
const geenBewaardeInstellingen = null;

const budgetSchrijfacties = (onChange: ReturnType<typeof vi.fn>) =>
  onChange.mock.calls.filter(([p]) => p && 'budget_excl' in p);

describe('PrijsCalculatorPaneel — openen mag niets overschrijven', () => {
  it('schrijft geen bedragen weg als het dossier al een berekening heeft', () => {
    const onChange = vi.fn();
    render(
      <PrijsCalculatorPaneel
        oppervlakteM2={60}
        calculatorState={geenBewaardeInstellingen}
        btwPercentage={6}
        opgeslagenBudgetExcl={48000}
        onChange={onChange}
      />,
    );
    expect(budgetSchrijfacties(onChange)).toHaveLength(0);
  });

  it('schrijft de basisberekening wel weg bij een dossier zonder bedragen', () => {
    const onChange = vi.fn();
    render(
      <PrijsCalculatorPaneel
        oppervlakteM2={60}
        calculatorState={geenBewaardeInstellingen}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={onChange}
      />,
    );
    expect(budgetSchrijfacties(onChange).length).toBeGreaterThan(0);
  });

  it('schrijft niets weg zonder oppervlakte', () => {
    const onChange = vi.fn();
    render(
      <PrijsCalculatorPaneel
        oppervlakteM2={null}
        calculatorState={geenBewaardeInstellingen}
        btwPercentage={6}
        opgeslagenBudgetExcl={null}
        onChange={onChange}
      />,
    );
    expect(budgetSchrijfacties(onChange)).toHaveLength(0);
  });
});
