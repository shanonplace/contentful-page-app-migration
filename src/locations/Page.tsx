import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  Heading,
  Stack,
  Text,
  Badge,
  TextInput,
  Flex,
  Note,
  Spinner,
} from "@contentful/f36-components";
import { PageAppSDK } from "@contentful/app-sdk";
import { useCMA, useSDK } from "@contentful/react-apps-toolkit";

interface Migration {
  migrationId: string;
  status: string;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
}

const Page = () => {
  const sdk = useSDK<PageAppSDK>();
  const cma = useCMA();

  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [backendUrl, setBackendUrl] = useState("http://localhost:3000");
  const [isStarting, setIsStarting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Check if there are any active migrations
  const hasActiveMigrations = migrations.some((m) => m.status === "started");

  const startMigration = async () => {
    setIsStarting(true);
    try {
      const signedRequest = await cma.appSignedRequest.create(
        { appDefinitionId: sdk.ids.app },
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          path: "/start-migration",
        }
      );

      const response = await fetch(`${backendUrl}/start-migration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...signedRequest.additionalHeaders,
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const migration = await response.json();
        setMigrations((prev) => [migration, ...prev]);
        sdk.notifier.success("Migration started!");
      } else {
        throw new Error("Failed to start migration");
      }
    } catch (error) {
      console.error("Error:", error);
      sdk.notifier.error("Failed to start migration");
    } finally {
      setIsStarting(false);
    }
  };

  const checkMigrationStatus = async (migrationId: string) => {
    try {
      const signedRequest = await cma.appSignedRequest.create(
        { appDefinitionId: sdk.ids.app },
        {
          method: "GET",
          headers: {},
          body: "",
          path: `/migration-status/${migrationId}`,
        }
      );

      const response = await fetch(
        `${backendUrl}/migration-status/${migrationId}`,
        {
          method: "GET",
          headers: {
            ...signedRequest.additionalHeaders,
          },
        }
      );

      if (response.ok) {
        const updatedMigration = await response.json();
        setMigrations((prev) => {
          const oldMigration = prev.find((m) => m.migrationId === migrationId);
          const wasStarted = oldMigration?.status === "started";
          const isNowComplete = updatedMigration.status === "completed";
          const isNowFailed = updatedMigration.status === "failed";

          // Show notification when status changes from started to completed/failed
          if (wasStarted && isNowComplete) {
            sdk.notifier.success(
              `Migration ${migrationId} completed successfully!`
            );
          } else if (wasStarted && isNowFailed) {
            sdk.notifier.error(`Migration ${migrationId} failed.`);
          }

          return prev.map((m) =>
            m.migrationId === migrationId ? { ...m, ...updatedMigration } : m
          );
        });
      }
    } catch (error) {
      console.error("Error checking migration status:", error);
    }
  };

  // Auto-poll active migrations
  useEffect(() => {
    const activeMigrations = migrations.filter((m) => m.status === "started");

    if (activeMigrations.length === 0) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    const interval = setInterval(() => {
      activeMigrations.forEach((migration) => {
        checkMigrationStatus(migration.migrationId);
      });
    }, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [migrations, backendUrl]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "started":
        return "primary";
      case "completed":
        return "positive";
      case "failed":
        return "negative";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "started") {
      return <Spinner size="small" />;
    }
    return null;
  };

  return (
    <div style={{ padding: "0 2rem" }}>
      <Stack spacing="spacingL">
        <div style={{ textAlign: "center" }}>
          <Heading>Migration Management</Heading>
          {isPolling && (
            <Text fontSize="fontSizeS" fontColor="gray600">
              <Flex
                justifyContent="center"
                alignItems="center"
                style={{ gap: "0.5rem" }}
              >
                <Spinner size="small" />
                Checking migration status...
              </Flex>
            </Text>
          )}
        </div>

        <Card>
          <Stack spacing="spacingM">
            <Heading as="h2">Start Migration</Heading>
            <Text>Click to start a new migration process.</Text>

            <Button
              variant="primary"
              onClick={startMigration}
              isDisabled={isStarting || hasActiveMigrations}
            >
              {isStarting
                ? "Starting..."
                : hasActiveMigrations
                ? "Migration in Progress..."
                : "Start Migration"}
            </Button>
          </Stack>
        </Card>

        <Card>
          <Stack spacing="spacingM">
            <Heading as="h2">Migration History</Heading>
            {migrations.length === 0 ? (
              <Note>No migrations started yet.</Note>
            ) : (
              <Stack spacing="spacingS">
                {migrations.map((migration) => (
                  <Card key={migration.migrationId}>
                    <Flex justifyContent="space-between" alignItems="center">
                      <Stack spacing="spacingXs">
                        <Text fontWeight="fontWeightMedium">
                          ID: {migration.migrationId}
                        </Text>
                        {migration.startedAt && (
                          <Text fontSize="fontSizeS" fontColor="gray600">
                            Started:{" "}
                            {new Date(migration.startedAt).toLocaleString()}
                          </Text>
                        )}
                        {migration.completedAt && (
                          <Text fontSize="fontSizeS" fontColor="gray600">
                            Completed:{" "}
                            {new Date(migration.completedAt).toLocaleString()}
                          </Text>
                        )}
                        {migration.duration && (
                          <Text fontSize="fontSizeS" fontColor="gray600">
                            Duration: {(migration.duration / 1000).toFixed(1)}s
                          </Text>
                        )}
                      </Stack>
                      <Flex alignItems="center" style={{ gap: "0.5rem" }}>
                        {getStatusIcon(migration.status)}
                        <Badge variant={getStatusColor(migration.status)}>
                          {migration.status.toUpperCase()}
                        </Badge>
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        </Card>
      </Stack>
    </div>
  );
};

export default Page;
