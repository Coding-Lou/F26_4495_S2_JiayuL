-- KEYS[1]: seat counter
-- KEYS[2]: admitted-users set
-- ARGV[1]: participant subject
-- 1 = released, 0 = user was not admitted, 2 = counter missing

if redis.call('EXISTS', KEYS[1]) == 0 then
    return 2
end

local removed = redis.call('SREM', KEYS[2], ARGV[1])
if removed == 0 then
    return 0
end

redis.call('INCR', KEYS[1])
return 1