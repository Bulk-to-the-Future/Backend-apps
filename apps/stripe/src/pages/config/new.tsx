import { Layout, TextLink } from "@saleor/apps-ui";
import { Box, Text } from "@saleor/macaw-ui";
import { NextPage } from "next";

import { AppBreadcrumbs } from "@/modules/ui/app-breadcrumbs";
import { NewStripeConfigForm } from "@/modules/ui/stripe-configs/new-stripe-config-form";
import { useHasAppAccess } from "@/modules/ui/use-has-app-access";

const NewConfiguration: NextPage = () => {
  const { haveAccessToApp } = useHasAppAccess();

  if (!haveAccessToApp) {
    return <Text>You do not have permission to access this page.</Text>;
  }

  return (
    <Box>
      <AppBreadcrumbs
        marginBottom={12}
        breadcrumbs={[
          {
            label: "Configuration",
            href: "/config",
          },
          {
            label: "New Stripe Configuration",
          },
        ]}
      />

      <Layout.AppSection
        marginBottom={14}
        heading="Stripe configuration"
        sideContent={
          <Text>
            All settings are required. Consult Stripe{" "}
            <TextLink href="https://docs.stripe.com/keys" newTab>
              docs
            </TextLink>{" "}
            to learn more about Publishable and Restricted keys.
          </Text>
        }
      >
        <NewStripeConfigForm />
      </Layout.AppSection>
    </Box>
  );
};

export default NewConfiguration;
