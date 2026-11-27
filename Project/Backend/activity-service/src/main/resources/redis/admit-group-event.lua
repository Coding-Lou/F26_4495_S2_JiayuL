-- KEYS[1]: remaining seats; KEYS[2]: admitted participant subjects；KEYS[3]: key for streams
-- ARGV[1]: participant subject
-- ARGV[2]: eventId
-- 0 = ADMITTED, 1 = FULL, 2 = DUPLICATE, 3 = NOT_READY
if redis.call('SISMEMBER', KEYS[2], ARGV[1]) == 1 then
    return 2
end

local seats = redis.call('GET', KEYS[1])
if seats == false then
    return 3
end

local remaining = tonumber(seats)
if remaining == nil then
    return redis.error_reply('Seat counter is not a number')
end
if remaining <= 0 then
    return 1
end

redis.call('DECR', KEYS[1])
redis.call('SADD', KEYS[2], ARGV[1])
redis.call('XADD', KEYS[3], '*', 'eventId', ARGV[2], 'participantSubject', ARGV[1])
return 0
