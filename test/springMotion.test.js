import test from 'node:test'
import assert from 'node:assert/strict'
import { sampleSpring, SPRING_DURATION } from '../src/utils/springMotion.js'

test('弹簧反向定目标继承位置和速度',()=>{
  const at=sampleSpring(0,200,0,60)
  const next=sampleSpring(at.value,0,at.velocity,0)
  assert.ok(Math.abs(next.value-at.value)<1e-9)
  assert.ok(Math.abs(next.velocity-at.velocity)<1e-9)
  assert.ok(sampleSpring(at.value,0,at.velocity,5).value>at.value)
  assert.ok(Math.abs(sampleSpring(at.value,0,at.velocity,SPRING_DURATION).value)<.1)
})
test('静止起步临界阻尼不超调并在限定时间内收敛',()=>{
  let prev=0
  for(let t=0;t<=SPRING_DURATION;t+=16){
    const {value}=sampleSpring(0,1000,0,t)
    assert.ok(value>=prev&&value<=1000);prev=value
  }
  assert.ok(1000-prev<.1)
})
