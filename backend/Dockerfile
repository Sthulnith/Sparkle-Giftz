# ─────────────────────────────────────────────────────────────
# Sparkle Giftz — Spring Boot Dockerfile (Java 21 + Maven)
# ─────────────────────────────────────────────────────────────

# Step 1: Build the JAR using JDK 21 & Maven
FROM eclipse-temurin:21-jdk-alpine AS build
RUN apk add --no-cache maven

WORKDIR /app
COPY . .

# Build from root or backend directory and isolate the single output JAR
RUN if [ -f "pom.xml" ]; then \
        mvn clean package -DskipTests && cp target/store-*.jar /app/app.jar; \
    elif [ -f "backend/pom.xml" ]; then \
        cd backend && mvn clean package -DskipTests && cp target/store-*.jar /app/app.jar; \
    fi

# Step 2: Lightweight JRE 21 Runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy the exact compiled app.jar
COPY --from=build /app/app.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
