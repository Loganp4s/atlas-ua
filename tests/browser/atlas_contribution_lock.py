import asyncio,json
from playwright.async_api import async_playwright
from lovable_playwright_defaults import signed_in_context
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True); c=await signed_in_context(b); a=await c.new_page(); other=await c.new_page()
  await a.goto('http://localhost:8080/financeiro',wait_until='networkidle');await other.goto('http://localhost:8080/financeiro',wait_until='networkidle')
  await a.evaluate("""async()=>{const m=await import('/src/lib/financeiro/pending-contribution.ts');window.testLockPromise=m.withContributionLock('isolated-lock-test','goal',()=>new Promise(resolve=>{window.releaseLock=resolve;}));}""")
  result=await other.evaluate("""async()=>{const m=await import('/src/lib/financeiro/pending-contribution.ts');let ran=false;try {await m.withContributionLock('isolated-lock-test','goal',async()=>{ran=true;});return {blocked:false,ran};}catch {return {blocked:true,ran};}}""")
  assert result=={'blocked':True,'ran':False}
  await a.evaluate('window.releaseLock()');await a.evaluate('window.testLockPromise')
  print(json.dumps({'real_browser_cross_tab_lock':True,'second_action_not_executed':True}))
  await b.close()
asyncio.run(main())
