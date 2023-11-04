import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as deployment from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cforigin from "aws-cdk-lib/aws-cloudfront-origins";

const app = new cdk.App();

const stack = new cdk.Stack(app, "ShopStack", {
  env: { region: "eu-west-1" },
});

const bucket = new s3.Bucket(stack, "ShopBucket", {
  bucketName: "nodejs-aws-shop",
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});

const accessIdentity = new cloudfront.OriginAccessIdentity(
  stack,
  "ShopBucketIdentity",
  {
    comment: bucket.bucketName,
  }
);

bucket.grantRead(accessIdentity);

const cfOrigin = new cforigin.S3Origin(bucket, {
  originAccessIdentity: accessIdentity,
});

const cf = new cloudfront.Distribution(stack, "ShopDistribution", {
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
cdk.Tags.of(stack).add("delete-on-destroy", "true");
cdk.Tags.of(cf).add("delete-on-destroy", "true");
