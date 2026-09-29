@echo off
setlocal

set "MAVEN_PROJECTBASEDIR=%~dp0"
set "MAVEN_WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar"
set "MAVEN_WRAPPER_PROPERTIES=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.properties"

if not exist "%MAVEN_WRAPPER_JAR%" (
    for /F "tokens=2 delims==" %%i in ('findstr /i "wrapperUrl" "%MAVEN_WRAPPER_PROPERTIES%"') do set "WRAPPER_URL=%%i"
    powershell -Command "Invoke-WebRequest -Uri '!WRAPPER_URL!' -OutFile '%MAVEN_WRAPPER_JAR%'"
)

if "%JAVA_HOME%"=="" (
    set "JAVA_CMD=java"
) else (
    set "JAVA_CMD=%JAVA_HOME%\bin\java"
)

"%JAVA_CMD%" -classpath "%MAVEN_WRAPPER_JAR%" "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" org.apache.maven.wrapper.MavenWrapperMain %*
