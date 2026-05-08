@echo off
setlocal EnableDelayedExpansion

set "MAVEN_PROJECTBASEDIR=%~dp0"
set "MAVEN_WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar"
set "MAVEN_WRAPPER_PROPERTIES=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.properties"

if not exist "%MAVEN_WRAPPER_JAR%" (
    echo Downloading Maven Wrapper...
    powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar' -OutFile '%MAVEN_WRAPPER_JAR%'"
)

if "%JAVA_HOME%"=="" (
    set "JAVA_CMD=java"
) else (
    set "JAVA_CMD=%JAVA_HOME%\bin\java.exe"
)

"%JAVA_CMD%" "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" -cp "%MAVEN_WRAPPER_JAR%" org.apache.maven.wrapper.MavenWrapperMain %*