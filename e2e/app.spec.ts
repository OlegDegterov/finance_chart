import { expect, test, type Page } from '@playwright/test';

/** На телефоне экраны переключаются нижними вкладками, на iPad всё на одном экране. */
async function openTab(page: Page, name: string) {
  const tab = page.getByRole('tab', { name });
  if (await tab.isVisible()) await tab.click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Доходы' }))
    .toBeVisible({ timeout: 15_000 })
    .catch(async () => {
      await openTab(page, 'Статьи');
      await expect(page.getByRole('heading', { name: 'Доходы' })).toBeVisible();
    });
});

test('статья добавляется, видна в таблице и переживает перезагрузку', async ({ page }, info) => {
  await openTab(page, 'Статьи');
  const income = page.getByRole('region', { name: 'Доходы' });
  await income.getByRole('button', { name: '+ Доход', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Фриланс');
  await dialog.getByLabel(/Сумма/).fill('30000');
  await dialog.getByRole('button', { name: 'Сохранить' }).click();

  await expect(income.getByText('Фриланс')).toBeVisible();

  // Зарплата 150 000 + проценты по вкладу 11 667 + фриланс 30 000 в первый месяц
  await openTab(page, 'График');
  await page.getByRole('button', { name: 'Таблица' }).click();
  const firstRow = page.getByRole('table').locator('tbody tr').first();
  await expect(firstRow).toContainText(/191.667/);
  await page.getByRole('button', { name: 'Таблица' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({ path: info.outputPath('chart.png') });

  await page.reload();
  await openTab(page, 'Статьи');
  await expect(page.getByText('Фриланс')).toBeVisible();
});

test('режимы графика переключаются без ошибок', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openTab(page, 'График');
  for (const mode of ['Линии', 'Доходы и расходы', 'Баланс', 'Слоями']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await expect(page.locator('canvas')).toBeVisible();
  }
  await page.getByRole('button', { name: 'По статьям' }).click();
  await page.getByRole('button', { name: 'Год', exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath('stacked-year.png') });
  expect(errors).toEqual([]);
});

test('смена валюты меняет подписи сумм', async ({ page }) => {
  await openTab(page, 'Настройки');
  await page.getByRole('combobox', { name: 'Валюта' }).click();
  await page.getByRole('option', { name: /Доллар США/ }).click();
  await expect(page.getByLabel(/Стартовый остаток/)).toBeVisible();
  await expect(page.getByText(/Стартовый остаток, \$/)).toBeVisible();
  await openTab(page, 'Статьи');
  await expect(page.getByText(/150.000.\$/).first()).toBeVisible();
  await page.reload();
  await openTab(page, 'Статьи');
  await expect(page.getByText(/150.000.\$/).first()).toBeVisible();
});

test('кнопка «+ Вклад» открывает форму депозита, вкладов может быть несколько', async ({
  page,
}) => {
  await openTab(page, 'Статьи');
  const income = page.getByRole('region', { name: 'Доходы' });
  await income.getByRole('button', { name: '+ Вклад', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading')).toHaveText(/вклад/);
  await dialog.getByLabel('Название').fill('Второй вклад');
  await dialog.getByLabel(/Сумма вклада/).fill('500000');
  await dialog.getByLabel(/Ставка/).fill('10');
  await dialog.getByRole('button', { name: 'Сохранить' }).click();
  await expect(income.getByText('Второй вклад')).toBeVisible();
  await expect(income.getByText(/на счёте к концу горизонта/)).toBeVisible();
  await expect(income.getByRole('button', { name: /Вклад в банке/ })).toBeVisible();
});
