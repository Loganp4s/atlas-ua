import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from lovable_playwright_defaults import signed_in_context
OUT=Path('/tmp/browser/atlas-131')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await signed_in_context(browser)
  page=await context.new_page()
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080/financeiro',wait_until='networkidle')
  await page.get_by_role('tab',name='Metas',exact=True).click()
  await page.get_by_role('button',name='Nova',exact=True).click()
  await page.get_by_label('Nome',exact=True).fill('Auditoria 1.3.1 — teste temporário')
  await page.get_by_label('Objetivo (R$)',exact=True).fill('1000')
  await page.get_by_label('Atual (R$)',exact=True).fill('100')
  await page.get_by_role('button',name='Salvar',exact=True).click()
  await page.get_by_text('Auditoria 1.3.1 — teste temporário',exact=True).wait_for()
  inp=page.get_by_role('spinbutton',name='Aporte em Auditoria 1.3.1 — teste temporário')
  await inp.fill('10')
  fetched=asyncio.Event()
  async def lose_response(route):
   response=await route.fetch()
   assert response.status==200, f'RPC status {response.status}'
   fetched.set()
   await route.abort('failed')
  await page.route('**/rest/v1/rpc/add_fin_goal_contribution',lose_response)
  await page.get_by_role('button',name='Aportar',exact=True).click()
  await fetched.wait()
  await page.get_by_role('button',name='Confirmar aporte',exact=True).wait_for()
  await page.wait_for_timeout(500)
  first=await page.evaluate("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('atlas:pending-contribution:'))))")
  assert first['amount']==10
  assert await inp.is_disabled()
  await page.screenshot(path=str(OUT/'1_lost_response.png'))
  await page.unroute('**/rest/v1/rpc/add_fin_goal_contribution',lose_response)
  await page.reload(wait_until='networkidle')
  await page.get_by_role('tab',name='Metas',exact=True).click()
  await page.get_by_role('button',name='Confirmar aporte',exact=True).wait_for()
  recovered=await page.evaluate("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('atlas:pending-contribution:'))))")
  assert recovered==first
  assert await inp.input_value()=='10'
  await page.screenshot(path=str(OUT/'2_recovered.png'))
  await page.get_by_role('button',name='Confirmar aporte',exact=True).click()
  await page.get_by_role('button',name='Aportar',exact=True).wait_for()
  assert await page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('atlas:pending-contribution:')).length")==0
  # Read via the same authenticated app API, not a mock or anonymous flow.
  async def data():
   return await page.evaluate("""async () => { const a = await import('/src/lib/financeiro/api.ts'); const goals = await a.listGoals(); const g = goals.find(g => g.name === 'Auditoria 1.3.1 — teste temporário'); return {goal:g,history:await a.listGoalContributions(g.id)}; }""")
  d=await data(); assert float(d['goal']['current_amount'])==110; assert len(d['history'])==1
  await inp.fill('20')
  await page.get_by_role('button',name='Aportar',exact=True).click()
  await page.wait_for_function("!Object.keys(localStorage).some(k=>k.startsWith('atlas:pending-contribution:'))")
  await page.wait_for_timeout(600)
  d=await data(); assert float(d['goal']['current_amount'])==130; assert len(d['history'])==2
  await page.get_by_role('button',name='Ações',exact=True).click()
  await page.get_by_role('menuitem',name='Editar').click()
  assert await page.get_by_label('Atual (R$)',exact=True).is_disabled()
  await page.get_by_label('Objetivo (R$)',exact=True).fill('2000')
  await page.get_by_role('button',name='Salvar',exact=True).click()
  await page.wait_for_timeout(600)
  d=await data(); assert float(d['goal']['current_amount'])==130; assert float(d['goal']['target_amount'])==2000
  await page.screenshot(path=str(OUT/'3_confirmed.png'))
  # Responsive check uses the actual viewport size under test.
  await page.set_viewport_size({'width':360,'height':800})
  assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  await page.screenshot(path=str(OUT/'4_mobile.png'))
  await page.evaluate("""async (id) => { const a=await import('/src/lib/financeiro/api.ts'); await a.deleteGoal(id); }""",d['goal']['id'])
  print(json.dumps({'authenticated_ui':True,'lost_response_committed':True,'reload_same_key':True,'retry_history_count':1,'successive_history_count':2,'final_balance':130,'initial_balance':100,'edit_preserves_balance':True,'pending_cleared':True,'mobile_overflow':False,'test_goal_deleted':True,'page_errors':errors},ensure_ascii=False))
  await browser.close()
asyncio.run(main())
