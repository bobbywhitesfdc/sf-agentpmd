/**
 * GameTwo_RandomChoice
 *
 * Default-in fix for the GameTwo half-duplex rock-paper-scissors agent.
 * The reasoning layer cannot produce a true random value — the original
 * generator substituted a deterministic `total_rounds mod 3` cycle that
 * was visibly broken on inspection. This invocable action moves the
 * single un-satisfiable capability (randomness) out of reasoning while
 * leaving everything else in the agent.
 *
 * ── Cache-busting cookie ──────────────────────────────────────────
 * Atlas caches invocable action results by input hash. An action with
 * no varying input collapses to a single cached result for the life
 * of the session. To defeat the cache, the action takes a
 * `cacheBuster` string input (the previous call's `nextCacheBuster`
 * output) and returns a fresh `nextCacheBuster` for the agent to
 * carry forward.
 *
 * ── Instrumentation ───────────────────────────────────────────────
 * Logger.debug() at entry / exit so we can confirm via Log__c /
 * LogEntry__c whether the action actually fired during a preview
 * session, vs the LLM hallucinating an outcome.
 *
 * Wired in the .agent file with:
 *     target: "apex://GameTwo_RandomChoice"
 */
public with sharing class GameTwo_RandomChoice {

    private static final List<String> CHOICES = new List<String>{
        'rock', 'paper', 'scissors'
    };

    @InvocableMethod(
        label='Pick a random RPS choice'
        description='Returns one of rock/paper/scissors chosen uniformly at random, plus a fresh cache-buster cookie to pass on the next call.'
    )
    public static List<Result> execute(List<Request> requests) {
        List<Result> results = new List<Result>();
        try {
            Integer count = (requests == null || requests.isEmpty()) ? 1 : requests.size();
            Logger.debug('GameTwo_RandomChoice ENTRY: requestCount=' + count);
            for (Integer i = 0; i < count; i++) {
                String inboundCookie = (requests != null && i < requests.size() && requests[i] != null)
                    ? requests[i].cacheBuster
                    : null;
                Result r = new Result();
                r.choice = CHOICES[Integer.valueOf(Math.floor(Math.random() * 3))];
                r.nextCacheBuster = freshCookie();
                Logger.debug(
                    'GameTwo_RandomChoice round[' + i + ']: inboundCookie=' + abbreviate(inboundCookie)
                    + ' choice=' + r.choice + ' nextCookie=' + abbreviate(r.nextCacheBuster)
                );
                results.add(r);
            }
            Logger.debug('GameTwo_RandomChoice EXIT: returning ' + results.size() + ' result(s)');
        } catch (Exception e) {
            Logger.error('GameTwo_RandomChoice failed: ' + e.getMessage());
        } finally {
            Logger.saveLog();
        }
        return results;
    }

    private static String freshCookie() {
        return String.valueOf(System.currentTimeMillis())
            + '-' + String.valueOf(Math.random());
    }

    private static String abbreviate(String s) {
        if (s == null) return 'null';
        if (s.length() <= 12) return s;
        return s.substring(0, 8) + '..';
    }

    public class Request {
        @InvocableVariable(
            label='Cache Buster'
            description='Opaque cookie from the previous call. Empty on the first invocation. Used only to vary the input hash so Atlas does not cache the result.'
            required=false
        )
        public String cacheBuster;
    }

    public class Result {
        @InvocableVariable(
            label='Choice'
            description='The randomly selected throw: rock, paper, or scissors.'
        )
        public String choice;

        @InvocableVariable(
            label='Next Cache Buster'
            description='Fresh cookie to pass back as cacheBuster on the next invocation.'
        )
        public String nextCacheBuster;
    }
}
