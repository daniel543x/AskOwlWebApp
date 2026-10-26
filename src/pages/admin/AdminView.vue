<script setup lang="ts">
import { onMounted, ref } from "vue";
import Message from "primevue/message";
import Skeleton from "primevue/skeleton";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { ApiError, apiFetch } from "../../shared/api/http";
import {
    CubeIcon,
    LockClosedIcon,
    ServerStackIcon,
    StarIcon,
} from "@heroicons/vue/24/outline";
import type { Provider } from "../../entities/provider";
import ConnectionManager from "../../components/admin/ConnectionManager.vue";
import AdminModelManager from "../../components/admin/AdminModelManager.vue";
import AdminDefaults from "../../components/admin/AdminDefaults.vue";

const activeTab = ref<"connections" | "models" | "defaults">("connections");
const forbidden = ref(false);
const checking = ref(true);

onMounted(async () => {
  try {
    await apiFetch<Provider[]>("/admin/models/providers");
    forbidden.value = false;
  } catch (error: unknown) {
    forbidden.value = error instanceof ApiError && error.status === 403;
  } finally {
    checking.value = false;
  }
});
</script>

<template>
    <div class="admin-view-inner">
        <header class="admin-head">
            <h1>Admin</h1>
            <p class="admin-sub">Manage the connections and model catalog every user shares.</p>
        </header>

        <div v-if="checking" class="admin-checking">
            <Skeleton height="3rem" width="100%" />
        </div>

        <Message v-else-if="forbidden" severity="warn">
            <template #icon><LockClosedIcon class="askowl-icon" /></template>
            The admin panel requires the admin role on your account. Ask an administrator
            to grant it via the role endpoints.
        </Message>

        <Tabs v-else v-model:value="activeTab" scrollable class="admin-tabs">
            <TabList>
                <Tab value="connections"><ServerStackIcon class="askowl-icon" /> Connections</Tab>
                <Tab value="models"><CubeIcon class="askowl-icon" /> Models</Tab>
                <Tab value="defaults"><StarIcon class="askowl-icon" /> Defaults</Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="connections">
                    <ConnectionManager />
                </TabPanel>
                <TabPanel value="models">
                    <AdminModelManager />
                </TabPanel>
                <TabPanel value="defaults">
                    <AdminDefaults />
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>

<style scoped>
.admin-view-inner {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 2rem;
    max-width: 72rem;
    margin: 0 auto;
    width: 100%;
}

.admin-head h1 {
    margin: 0 0 0.25rem;
    font-size: 2rem;
    font-weight: 400;
    letter-spacing: -0.01em;
}

.admin-sub {
    margin: 0 0 1.5rem;
    color: var(--p-text-muted-color);
}

.admin-checking {
    padding-top: 0.5rem;
}
</style>
