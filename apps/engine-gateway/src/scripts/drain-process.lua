-- Atomically claim one stock unit for a queued user.
-- Returns  1 if the user WON (stock decremented, result written).
-- Returns -1 if stock is exhausted (SOLD_OUT written, nothing decremented).

local eventKey  = KEYS[1]
local resultKey = KEYS[2]
local userId    = ARGV[1]

local stock = tonumber(redis.call('HGET', eventKey, 'stock'))

if stock == nil or stock <= 0 then
    redis.call('HSET', resultKey, userId, 'SOLD_OUT')
    return -1
end

redis.call('HINCRBY', eventKey, 'stock', -1)
redis.call('HSET', resultKey, userId, 'WON')
return 1
