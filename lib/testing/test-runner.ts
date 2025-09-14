/**
 * Comprehensive test runner and utilities
 * Provides test execution, reporting, and analysis tools
 */

import { testConfig, setupTestData, cleanupTestData, setupMockAPI, cleanupMockAPI } from './test-setup'

export interface TestResult {
  name: string
  status: 'passed' | 'failed' | 'skipped' | 'pending'
  duration: number
  error?: Error
  assertions: number
  startTime: number
  endTime: number
}

export interface TestSuiteResult {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  tests: TestResult[]
  startTime: number
  endTime: number
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
    pending: number
  }
}

export interface TestRunResult {
  status: 'passed' | 'failed' | 'partial'
  duration: number
  suites: TestSuiteResult[]
  startTime: number
  endTime: number
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
    pending: number
    coverage?: {
      statements: number
      branches: number
      functions: number
      lines: number
    }
  }
}

export class TestRunner {
  private suites: TestSuiteResult[] = []
  private currentSuite: TestSuiteResult | null = null
  private currentTest: TestResult | null = null
  private startTime: number = 0
  private endTime: number = 0

  constructor(private options: {
    verbose?: boolean
    timeout?: number
    retries?: number
    parallel?: boolean
    coverage?: boolean
  } = {}) {
    this.options = {
      verbose: false,
      timeout: testConfig.defaultTimeout,
      retries: 0,
      parallel: false,
      coverage: false,
      ...options,
    }
  }

  /**
   * Start a test suite
   */
  startSuite(name: string): void {
    this.currentSuite = {
      name,
      status: 'pending' as any,
      duration: 0,
      tests: [],
      startTime: Date.now(),
      endTime: 0,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        pending: 0,
      },
    }
    
    if (this.options.verbose) {
      console.log(`\n🧪 Starting test suite: ${name}`)
    }
  }

  /**
   * End the current test suite
   */
  endSuite(): void {
    if (!this.currentSuite) return

    this.currentSuite.endTime = Date.now()
    this.currentSuite.duration = this.currentSuite.endTime - this.currentSuite.startTime
    
    // Determine suite status
    if (this.currentSuite.summary.failed > 0) {
      this.currentSuite.status = 'failed'
    } else if (this.currentSuite.summary.skipped > 0 && this.currentSuite.summary.passed === 0) {
      this.currentSuite.status = 'skipped'
    } else {
      this.currentSuite.status = 'passed'
    }

    this.suites.push(this.currentSuite)
    
    if (this.options.verbose) {
      console.log(`\n✅ Completed test suite: ${this.currentSuite.name}`)
      console.log(`   Duration: ${this.currentSuite.duration}ms`)
      console.log(`   Tests: ${this.currentSuite.summary.passed}/${this.currentSuite.summary.total} passed`)
    }

    this.currentSuite = null
  }

  /**
   * Start a test
   */
  startTest(name: string): void {
    this.currentTest = {
      name,
      status: 'pending' as any,
      duration: 0,
      assertions: 0,
      startTime: Date.now(),
      endTime: 0,
    }
    
    if (this.options.verbose) {
      console.log(`\n  🔍 Running test: ${name}`)
    }
  }

  /**
   * End the current test
   */
  endTest(status: TestResult['status'], error?: Error): void {
    if (!this.currentTest || !this.currentSuite) return

    this.currentTest.endTime = Date.now()
    this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime
    this.currentTest.status = status
    this.currentTest.error = error

    this.currentSuite.tests.push(this.currentTest)
    this.currentSuite.summary.total++
    this.currentSuite.summary[status]++

    if (this.options.verbose) {
      const statusIcon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️'
      console.log(`    ${statusIcon} ${this.currentTest.name} (${this.currentTest.duration}ms)`)
      if (error) {
        console.log(`      Error: ${error.message}`)
      }
    }

    this.currentTest = null
  }

  /**
   * Add an assertion to the current test
   */
  addAssertion(): void {
    if (this.currentTest) {
      this.currentTest.assertions++
    }
  }

  /**
   * Run a test function
   */
  async runTest(name: string, testFn: () => Promise<void> | void): Promise<TestResult> {
    this.startTest(name)
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Test timeout after ${this.options.timeout}ms`)), this.options.timeout)
      })
      
      await Promise.race([testFn(), timeoutPromise])
      this.endTest('passed')
    } catch (error) {
      this.endTest('failed', error as Error)
    }
    
    return this.currentSuite!.tests[this.currentSuite!.tests.length - 1]
  }

  /**
   * Run a test suite
   */
  async runSuite(name: string, suiteFn: () => Promise<void> | void): Promise<TestSuiteResult> {
    this.startSuite(name)
    
    try {
      await suiteFn()
    } catch (error) {
      if (this.options.verbose) {
        console.error(`\n❌ Test suite failed: ${name}`)
        console.error(`   Error: ${(error as Error).message}`)
      }
    }
    
    this.endSuite()
    return this.suites[this.suites.length - 1]
  }

  /**
   * Run all test suites
   */
  async runAll(): Promise<TestRunResult> {
    this.startTime = Date.now()
    
    if (this.options.verbose) {
      console.log('\n🚀 Starting test run...')
    }

    // Set up test environment
    setupTestData()
    setupMockAPI()

    try {
      // Run all test suites
      for (const suite of this.suites) {
        await this.runSuite(suite.name, async () => {
          // Suite logic would be implemented here
        })
      }
    } finally {
      // Clean up test environment
      cleanupTestData()
      cleanupMockAPI()
    }

    this.endTime = Date.now()
    
    return this.getResults()
  }

  /**
   * Get test run results
   */
  getResults(): TestRunResult {
    const summary = this.suites.reduce(
      (acc, suite) => ({
        total: acc.total + suite.summary.total,
        passed: acc.passed + suite.summary.passed,
        failed: acc.failed + suite.summary.failed,
        skipped: acc.skipped + suite.summary.skipped,
        pending: acc.pending + suite.summary.pending,
      }),
      { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0 }
    )

    const status = summary.failed > 0 ? 'failed' : summary.passed > 0 ? 'passed' : 'partial'

    return {
      status,
      duration: this.endTime - this.startTime,
      suites: [...this.suites],
      startTime: this.startTime,
      endTime: this.endTime,
      summary,
    }
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const results = this.getResults()
    const duration = results.duration
    const totalTests = results.summary.total
    const passedTests = results.summary.passed
    const failedTests = results.summary.failed
    const skippedTests = results.summary.skipped

    let report = '\n📊 Test Report\n'
    report += '='.repeat(50) + '\n\n'
    
    report += `Status: ${results.status.toUpperCase()}\n`
    report += `Duration: ${duration}ms\n`
    report += `Total Tests: ${totalTests}\n`
    report += `Passed: ${passedTests}\n`
    report += `Failed: ${failedTests}\n`
    report += `Skipped: ${skippedTests}\n\n`

    if (failedTests > 0) {
      report += '❌ Failed Tests:\n'
      report += '-'.repeat(30) + '\n'
      
      results.suites.forEach(suite => {
        const failedTests = suite.tests.filter(test => test.status === 'failed')
        if (failedTests.length > 0) {
          report += `\n${suite.name}:\n`
          failedTests.forEach(test => {
            report += `  - ${test.name}: ${test.error?.message || 'Unknown error'}\n`
          })
        }
      })
      report += '\n'
    }

    if (this.options.verbose) {
      report += '📋 Test Details:\n'
      report += '-'.repeat(30) + '\n'
      
      results.suites.forEach(suite => {
        report += `\n${suite.name} (${suite.duration}ms):\n`
        suite.tests.forEach(test => {
          const statusIcon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'
          report += `  ${statusIcon} ${test.name} (${test.duration}ms, ${test.assertions} assertions)\n`
        })
      })
    }

    return report
  }

  /**
   * Export results to JSON
   */
  exportResults(): string {
    return JSON.stringify(this.getResults(), null, 2)
  }

  /**
   * Export results to CSV
   */
  exportResultsCSV(): string {
    const results = this.getResults()
    const headers = ['Suite', 'Test', 'Status', 'Duration', 'Assertions', 'Error']
    const rows = [headers.join(',')]

    results.suites.forEach(suite => {
      suite.tests.forEach(test => {
        const row = [
          suite.name,
          test.name,
          test.status,
          test.duration,
          test.assertions,
          test.error?.message || '',
        ]
        rows.push(row.map(field => `"${field}"`).join(','))
      })
    })

    return rows.join('\n')
  }

  /**
   * Clear all results
   */
  clear(): void {
    this.suites = []
    this.currentSuite = null
    this.currentTest = null
    this.startTime = 0
    this.endTime = 0
  }
}

// Test assertion utilities
export class TestAssertions {
  private testRunner: TestRunner

  constructor(testRunner: TestRunner) {
    this.testRunner = testRunner
  }

  /**
   * Assert that a condition is true
   */
  assert(condition: boolean, message?: string): void {
    this.testRunner.addAssertion()
    if (!condition) {
      throw new Error(message || 'Assertion failed')
    }
  }

  /**
   * Assert that two values are equal
   */
  assertEquals(actual: any, expected: any, message?: string): void {
    this.testRunner.addAssertion()
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, but got ${actual}`)
    }
  }

  /**
   * Assert that two values are not equal
   */
  assertNotEquals(actual: any, expected: any, message?: string): void {
    this.testRunner.addAssertion()
    if (actual === expected) {
      throw new Error(message || `Expected ${actual} to not equal ${expected}`)
    }
  }

  /**
   * Assert that a value is truthy
   */
  assertTruthy(value: any, message?: string): void {
    this.testRunner.addAssertion()
    if (!value) {
      throw new Error(message || `Expected truthy value, but got ${value}`)
    }
  }

  /**
   * Assert that a value is falsy
   */
  assertFalsy(value: any, message?: string): void {
    this.testRunner.addAssertion()
    if (value) {
      throw new Error(message || `Expected falsy value, but got ${value}`)
    }
  }

  /**
   * Assert that a value is null
   */
  assertNull(value: any, message?: string): void {
    this.testRunner.addAssertion()
    if (value !== null) {
      throw new Error(message || `Expected null, but got ${value}`)
    }
  }

  /**
   * Assert that a value is not null
   */
  assertNotNull(value: any, message?: string): void {
    this.testRunner.addAssertion()
    if (value === null) {
      throw new Error(message || `Expected non-null value, but got null`)
    }
  }

  /**
   * Assert that a value is undefined
   */
  assertUndefined(value: any, message?: string): void {
    this.testRunner.addAssertion()
    if (value !== undefined) {
      throw new Error(message || `Expected undefined, but got ${value}`)
    }
  }

  /**
   * Assert that a value is not undefined
   */
  assertNotUndefined(value: any, message?: string): void {
    this.testRunner.addAssertion()
    if (value === undefined) {
      throw new Error(message || `Expected non-undefined value, but got undefined`)
    }
  }

  /**
   * Assert that a function throws an error
   */
  assertThrows(fn: () => void, expectedError?: string | RegExp, message?: string): void {
    this.testRunner.addAssertion()
    let threw = false
    let thrownError: Error | null = null
    
    try {
      fn()
    } catch (error) {
      threw = true
      thrownError = error as Error
    }
    
    if (!threw) {
      throw new Error(message || 'Expected function to throw an error')
    }
    
    if (expectedError && thrownError) {
      const errorMessage = thrownError.message
      if (typeof expectedError === 'string') {
        if (!errorMessage.includes(expectedError)) {
          throw new Error(message || `Expected error message to contain "${expectedError}", but got "${errorMessage}"`)
        }
      } else if (expectedError instanceof RegExp) {
        if (!expectedError.test(errorMessage)) {
          throw new Error(message || `Expected error message to match ${expectedError}, but got "${errorMessage}"`)
        }
      }
    }
  }

  /**
   * Assert that a function does not throw an error
   */
  assertDoesNotThrow(fn: () => void, message?: string): void {
    this.testRunner.addAssertion()
    try {
      fn()
    } catch (error) {
      throw new Error(message || `Expected function to not throw an error, but got: ${(error as Error).message}`)
    }
  }

  /**
   * Assert that an array contains a value
   */
  assertContains(array: any[], value: any, message?: string): void {
    this.testRunner.addAssertion()
    if (!array.includes(value)) {
      throw new Error(message || `Expected array to contain ${value}`)
    }
  }

  /**
   * Assert that an array does not contain a value
   */
  assertNotContains(array: any[], value: any, message?: string): void {
    this.testRunner.addAssertion()
    if (array.includes(value)) {
      throw new Error(message || `Expected array to not contain ${value}`)
    }
  }

  /**
   * Assert that an array has a specific length
   */
  assertLength(array: any[], expectedLength: number, message?: string): void {
    this.testRunner.addAssertion()
    if (array.length !== expectedLength) {
      throw new Error(message || `Expected array length ${expectedLength}, but got ${array.length}`)
    }
  }

  /**
   * Assert that an object has a property
   */
  assertHasProperty(obj: any, property: string, message?: string): void {
    this.testRunner.addAssertion()
    if (!(property in obj)) {
      throw new Error(message || `Expected object to have property "${property}"`)
    }
  }

  /**
   * Assert that an object does not have a property
   */
  assertNotHasProperty(obj: any, property: string, message?: string): void {
    this.testRunner.addAssertion()
    if (property in obj) {
      throw new Error(message || `Expected object to not have property "${property}"`)
    }
  }
}

// Export utilities
export default {
  TestRunner,
  TestAssertions,
  testConfig,
}
