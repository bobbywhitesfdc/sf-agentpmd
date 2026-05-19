import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseApexSource } from '../../src/analyzer/apex-parse.js';
import {
  complexityOfMethod,
  methodsInCompilationUnit,
} from '../../src/analyzer/apex-complexity.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string) =>
  resolve(here, '..', 'fixtures', 'gametwo', rel);

function methodCCs(clsPath: string): Record<string, number> {
  const cu = parseApexSource(readFileSync(clsPath, 'utf8'));
  const out: Record<string, number> = {};
  for (const m of methodsInCompilationUnit(cu)) {
    const cc = complexityOfMethod(m);
    out[cc.name] = cc.complexity;
  }
  return out;
}

describe('Apex McCabe CC walker', () => {
  it('matches hand-counted CC for GameTwo_RandomChoice.cls', () => {
    const ccs = methodCCs(fixture('classes/GameTwo_RandomChoice.cls'));
    // execute: try/catch (+1 catch) + for-loop (+1) + Initial ternary
    //   `(requests == null || requests.isEmpty()) ? 1 : requests.size()`
    //   (+1 ternary, +1 ||) + inside-loop ternary
    //   `(requests != null && i < requests.size() && requests[i] != null)
    //    ? requests[i].cacheBuster : null` (+1 ternary, +2 &&) = 7 → CC 8
    expect(ccs.execute).toBe(8);
    // freshCookie: no control flow → CC 1
    expect(ccs.freshCookie).toBe(1);
    // abbreviate: 2 ifs → CC 3
    expect(ccs.abbreviate).toBe(3);
  });

  it('matches hand-counted CC for GameTwo_PlayRound.cls', () => {
    const ccs = methodCCs(fixture('classes/GameTwo_PlayRound.cls'));
    // execute: try/catch (+1) + for-loop (+1) + 2 ternaries (+2)
    //   `(requests == null) ? 0 : ...` and
    //   `(r.errorMessage == null ? '' : ' err=' + ...)` = 4 → CC 5
    expect(ccs.execute).toBe(5);
    // playOne: 1 ternary + 1 if (invalid choice guard) + 1 if (player == agent)
    //   + 1 else-if (win-compound) which is 1 if + 3 && + 2 || = 9 → CC 10
    expect(ccs.playOne).toBe(10);
    // parseCount: 1 if + 1 catch = 2 → CC 3
    expect(ccs.parseCount).toBe(3);
  });

  it('renders formal parameter signatures with whitespace between type and id', () => {
    // ANTLR getText() concatenates tokens with no whitespace, which previously
    // produced `List<Request>requests` instead of `List<Request> requests`.
    const cu = parseApexSource(
      readFileSync(fixture('classes/GameTwo_PlayRound.cls'), 'utf8'),
    );
    const methods = methodsInCompilationUnit(cu).map(complexityOfMethod);
    const execute = methods.find(m => m.name === 'execute')!;
    expect(execute.signature).toBe('List<Result> execute(List<Request> requests)');
    const playOne = methods.find(m => m.name === 'playOne')!;
    expect(playOne.signature).toBe('Result playOne(Request req)');
    const parseCount = methods.find(m => m.name === 'parseCount')!;
    expect(parseCount.signature).toBe('Integer parseCount(String s)');
  });

  it('skips when-else arms and does not count else/finally/try', () => {
    const source = `
      public class WhenTest {
        public static String classify(Integer n) {
          try {
            switch on n {
              when 1, 2 { return 'low'; }
              when 3 { return 'mid'; }
              when else { return 'other'; }
            }
          } catch (Exception e) {
            return null;
          } finally {
            // finally — must NOT count
          }
          return null;
        }
      }
    `;
    const cu = parseApexSource(source);
    const methods = methodsInCompilationUnit(cu);
    expect(methods).toHaveLength(1);
    const cc = complexityOfMethod(methods[0]);
    // 2 explicit when arms (not the when-else) + 1 catch = 3 contributors
    expect(cc.complexity).toBe(4);
    expect(cc.contributors.filter(c => c.kind === 'when_arm')).toHaveLength(2);
    expect(cc.contributors.filter(c => c.kind === 'catch_clause')).toHaveLength(1);
  });
});
