#!/bin/bash
# Collect JaCoCo coverage from the running API container

set -e

CONTAINER_NAME="e2e-creatorpipeline-api"
COVERAGE_DIR="coverage/backend"
EXEC_FILE="$COVERAGE_DIR/jacoco.exec"

mkdir -p "$COVERAGE_DIR"

echo "📥 Dumping JaCoCo coverage from $CONTAINER_NAME..."

# Dump coverage via TCP using jacococli inside the container
docker exec "$CONTAINER_NAME" java -jar /jacoco/jacococli.jar dump \
  --address localhost \
  --port 6300 \
  --destfile /tmp/jacoco.exec

# Copy the exec file out of the container
docker cp "$CONTAINER_NAME:/tmp/jacoco.exec" "$EXEC_FILE"

echo "✅ JaCoCo coverage saved to $EXEC_FILE"

# Check if we have class files to generate report
API_BUILD_DIR="../creatorpipeline-api/build/classes/java/main"
API_SRC_DIR="../creatorpipeline-api/src/main/java"

if [ -d "$API_BUILD_DIR" ]; then
  echo "📊 Generating JaCoCo HTML report..."

  # Use jacococli from container to generate report
  docker cp "$CONTAINER_NAME:/jacoco/jacococli.jar" "/tmp/jacococli.jar"

  java -jar /tmp/jacococli.jar report "$EXEC_FILE" \
    --classfiles "$API_BUILD_DIR" \
    --sourcefiles "$API_SRC_DIR" \
    --html "$COVERAGE_DIR/html" \
    --xml "$COVERAGE_DIR/jacoco.xml" \
    --csv "$COVERAGE_DIR/jacoco.csv"

  echo "✅ JaCoCo report generated at $COVERAGE_DIR/html/index.html"
else
  echo "⚠️  Class files not found at $API_BUILD_DIR"
  echo "   Run 'cd ../creatorpipeline-api && ./gradlew classes' to build them"
  echo "   Then re-run this script to generate the HTML report"
fi
