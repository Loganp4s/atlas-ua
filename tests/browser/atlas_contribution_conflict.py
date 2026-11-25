import asyncio,json
from playwright.async_api import async_playwright
from lovable_playwright_defaults import signed_in_context
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True); c=await signed_in_context(b); page=await c.new_page()
  await page.goto('http://localhost:8080/financeiro',wait_until='networkidle')
  data=await page.evaluate("""async () => {const a=await import('/src/lib/financeiro/api.ts'); const g=await a.createGoal({name:'Teste conflito 1.3.1',target_amount:1000,current_amount:100,color:'#0EA5E9'});const h=await a.createGoal({name:'Teste pendente separado 1.3.1',target_amount:1000,current_amount:0,color:'#0EA5E9'});return {g,h};}""")
  await page.get_by_role('tab',name='Metas',exact=True).click()
  await page.wait_for_timeout(400)
  inp=page.get_by_role('spinbutton',name='Aporte em Teste conflito 1.3.1')
  await inp.fill('10')
  saved=asyncio.Event()
  async def lost(route):
   r=await route.fetch(); assert r.status==200; saved.set(); await route.abort('failed')
  await page.route('**/rest/v1/rpc/add_fin_goal_contribution',lost)
  card=page.locator('li').filter(has=inp)
  # Cards are not list items; use the nearest parent containing the input and buttons.
  card=inp.locator('xpath=../..')
  await card.get_by_role('button',name='Aportar',exact=True).click();await saved.wait();await page.wait_for_timeout(400)
  assert await card.get_by_role('button',name='Confirmar aporte').count()==1
  await page.unroute('**/rest/v1/rpc/add_fin_goal_contribution',lost)
  # Simulate mismatched persisted parameters to test the actual server conflict path.
  await page.evaluate("""({g,h}) => {const k=Object.keys(localStorage).find(k=>k.startsWith('atlas:pending-contribution:'));const p=JSON.parse(localStorage.getItem(k)); localStorage.setItem(k,JSON.stringify({...p,amount:20})); const other={...p,goalId:h.id,amount:5,requestId:crypto.randomUUID()};localStorage.setItem(`atlas:pending-contribution:v1:${p.userId}:${h.id}`,JSON.stringify(other));}""",data)
  await page.reload(wait_until='networkidle'); await page.get_by_role('tab',name='Metas',exact=True).click()
  inp=page.get_by_role('spinbutton',name='Aporte em Teste conflito 1.3.1'); card=inp.locator('xpath=../..')
  await card.get_by_role('button',name='Confirmar aporte').click()
  await card.get_by_text('Conflito confirmado.',exact=False).wait_for()
  assert await card.get_by_role('button',name='Confirmar aporte').is_disabled()
  await card.get_by_role('button',name='Ações').click()
  assert await page.get_by_role('menuitem',name='Excluir',exact=True).is_disabled(); await page.keyboard.press('Escape')
  await page.screenshot(path='/tmp/browser/atlas-131/5_conflict.png')
  other=page.get_by_role('spinbutton',name='Aporte em Teste pendente separado 1.3.1').locator('xpath=../..')
  await other.get_by_role('button',name='Confirmar aporte').click();await page.wait_for_timeout(600)
  result=await page.evaluate("""async ({g,h})=>{const a=await import('/src/lib/financeiro/api.ts');const goals=await a.listGoals();return {g:goals.find(x=>x.id===g.id),h:goals.find(x=>x.id===h.id),keys:Object.keys(localStorage).filter(k=>k.startsWith('atlas:pending-contribution:')),history:await a.listGoalContributions(g.id)};}""",data)
  assert float(result['g']['current_amount'])==110;assert len(result['history'])==1;assert float(result['h']['current_amount'])==5;assert len(result['keys'])==1
  await page.evaluate("""async ({g,h})=>{const a=await import('/src/lib/financeiro/api.ts');await a.deleteGoal(g.id);await a.deleteGoal(h.id);Object.keys(localStorage).filter(k=>k.startsWith('atlas:pending-contribution:')).forEach(k=>localStorage.removeItem(k));}""",data)
  print(json.dumps({'actual_rpc_conflict_ui':True,'conflict_blocks_retry':True,'pending_blocks_delete':True,'success_clears_only_own_pending':True,'conflict_goal_balance':110,'conflict_goal_history_count':1,'test_goals_deleted':True}))
  await b.close()
asyncio.run(main())
