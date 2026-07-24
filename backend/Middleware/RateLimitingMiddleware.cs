using System.Collections.Concurrent;

namespace SaasPos.Backend.Middleware
{
    public class RateLimitingService
    {
        private readonly ConcurrentDictionary<string, RateLimitEntry> _requests = new();
        private readonly int _maxRequests;
        private readonly TimeSpan _window;

        public RateLimitingService(int maxRequests = 30, int windowSeconds = 60)
        {
            _maxRequests = maxRequests;
            _window = TimeSpan.FromSeconds(windowSeconds);
        }

        public bool IsLimited(string key)
        {
            var now = DateTime.UtcNow;
            var entry = _requests.AddOrUpdate(key,
                _ => new RateLimitEntry { Count = 1, WindowStart = now },
                (_, existing) =>
                {
                    if (now - existing.WindowStart > _window)
                    {
                        return new RateLimitEntry { Count = 1, WindowStart = now };
                    }
                    existing.Count++;
                    return existing;
                });

            return entry.Count > _maxRequests;
        }

        public int GetRetryAfterSeconds(string key)
        {
            if (_requests.TryGetValue(key, out var entry))
            {
                var elapsed = (DateTime.UtcNow - entry.WindowStart).TotalSeconds;
                return Math.Max(1, (int)(_window.TotalSeconds - elapsed));
            }
            return 1;
        }
    }

    public class RateLimitEntry
    {
        public int Count { get; set; }
        public DateTime WindowStart { get; set; }
    }

    public class AccountLockoutService
    {
        private readonly ConcurrentDictionary<string, LockoutEntry> _attempts = new();
        private readonly int _maxAttempts;
        private readonly TimeSpan _lockoutDuration;

        public AccountLockoutService(int maxAttempts = 5, int lockoutMinutes = 15)
        {
            _maxAttempts = maxAttempts;
            _lockoutDuration = TimeSpan.FromMinutes(lockoutMinutes);
        }

        public bool IsLockedOut(string email)
        {
            if (_attempts.TryGetValue(email, out var entry))
            {
                if (entry.LockedUntil.HasValue && DateTime.UtcNow < entry.LockedUntil.Value)
                    return true;

                if (entry.LockedUntil.HasValue && DateTime.UtcNow >= entry.LockedUntil.Value)
                {
                    _attempts.TryRemove(email, out _);
                    return false;
                }
            }
            return false;
        }

        public void RecordFailedAttempt(string email)
        {
            _attempts.AddOrUpdate(email,
                _ => new LockoutEntry { FailedAttempts = 1, LastAttempt = DateTime.UtcNow },
                (_, existing) =>
                {
                    existing.FailedAttempts++;
                    existing.LastAttempt = DateTime.UtcNow;
                    if (existing.FailedAttempts >= _maxAttempts)
                    {
                        existing.LockedUntil = DateTime.UtcNow.Add(_lockoutDuration);
                    }
                    return existing;
                });
        }

        public void ResetAttempts(string email)
        {
            _attempts.TryRemove(email, out _);
        }

        public int GetRemainingAttempts(string email)
        {
            if (_attempts.TryGetValue(email, out var entry))
            {
                return Math.Max(0, _maxAttempts - entry.FailedAttempts);
            }
            return _maxAttempts;
        }
    }

    public class LockoutEntry
    {
        public int FailedAttempts { get; set; }
        public DateTime LastAttempt { get; set; }
        public DateTime? LockedUntil { get; set; }
    }
}
