import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as deployment from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cforigin from "aws-cdk-lib/aws-cloudfront-origins";
import * as customResources from "aws-cdk-lib/custom-resources";

const app = new cdk.App();

const stack = new cdk.Stack(app, "MyShopStack", {
  env: { region: "eu-west-1" },
});

const bucket = new s3.Bucket(stack, "MyShopBucket", {
  bucketName: "nodejs-aws-myshop",
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});

const accessIdentity = new cloudfront.OriginAccessIdentity(
  stack,
  "MyShopBucketIdentity",
  {
    comment: bucket.bucketName,
  }
);

bucket.grantRead(accessIdentity);

const cfOrigin = new cforigin.S3Origin(bucket, {
  originAccessIdentity: accessIdentity,
});

const cf = new cloudfront.Distribution(stack, "MyShopDistribution", {
  defaultBehavior: {
    origin: cfOrigin,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  defaultRootObject: "index.html",
  errorResponses: [
    {
      httpStatus: 404,
      responseHttpStatus: 200,
      responsePagePath: "/index.html",
    },
  ],
});

new deployment.BucketDeployment(stack, "DeployApp", {
  destinationBucket: bucket,
  sources: [deployment.Source.asset("./dist")],
  distribution: cf,
  distributionPaths: ["/*"],
});

const invalidation = new customResources.AwsCustomResource(
  stack,
  "Invalidation",
  {
    onCreate: {
      service: "CloudFront",
      action: "createInvalidation",
      parameters: {
        DistributionId: cf.distributionId,
        InvalidationBatch: {
          CallerReference: Date.now().toString(),
          Paths: { Quantity: 1, Items: ["/*"] },
        },
      },
      physicalResourceId:
        customResources.PhysicalResourceId.of("InvalidationId"),
    },
    policy: customResources.AwsCustomResourcePolicy.fromSdkCalls({
      resources: customResources.AwsCustomResourcePolicy.ANY_RESOURCE,
    }),
  }
);

invalidation.node.addDependency(cf);

new cdk.CfnOutput(stack, "СloudFrontURL", {
  value: cf.distributionDomainName,
  description: "The URL of the cloudfront",
});

new cdk.CfnOutput(stack, "bucketUrl", {
  value: bucket.bucketWebsiteUrl,
  description: "The URL of the bucket",
});
